"""Clothes routes (authenticated, owner-scoped)."""

import asyncio
import base64
import binascii
import logging
from urllib.parse import unquote_to_bytes

import httpx
from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func, select
from starlette.responses import Response

from app.dependencies.auth import CurrentUser
from app.dependencies.database import DbSession
from app.exceptions.app_exceptions import AppException
from app.models.clothes import Clothes, ClothesType
from app.schemas.clothes import (
    ClothesAnalyzeResponse,
    ClothesCreate,
    ClothesDuplicateCheckRequest,
    ClothesDuplicateCheckResponse,
    ClothesDuplicateItem,
    ClothesImageUploadResponse,
    ClothesListResponse,
    ClothesResponse,
)
from app.services.ai_tagging import analyze_image
from app.services.clothes_duplicate_detection import (
    _decode_base64_payload,
    detect_similar_clothes,
)
from app.services.clothes_vision_pipeline import analyze_garment_image
from app.services.runtime_settings import get_system_settings
from app.services.s3_storage import upload_clothes_object

logger = logging.getLogger(__name__)

router = APIRouter()

_MAX_PAGE_SIZE = 100
_MAX_SHARE_IMAGE_BYTES = 6 * 1024 * 1024


def _decode_data_url_image(url: str) -> tuple[bytes, str]:
    """Parse a ``data:`` image URL into bytes and MIME type."""
    u = url.strip()
    if not u.startswith("data:"):
        raise ValueError("not a data URL")
    comma = u.find(",")
    if comma < 0:
        raise ValueError("invalid data URL")
    meta = u[5:comma]
    payload = u[comma + 1 :]
    mime = "application/octet-stream"
    parts = [p.strip() for p in meta.split(";") if p.strip()]
    if parts:
        mime = parts[0] or mime
    is_b64 = any(p.lower() == "base64" for p in parts[1:])
    try:
        if is_b64:
            raw = base64.b64decode(payload, validate=False)
        else:
            raw = unquote_to_bytes(payload)
    except (binascii.Error, ValueError) as exc:
        raise ValueError("invalid data URL payload") from exc
    return raw, mime


async def _load_share_image_bytes(url: str) -> tuple[bytes, str]:
    u = url.strip()
    if u.startswith("data:"):
        try:
            return _decode_data_url_image(u)
        except ValueError as exc:
            raise AppException(
                "Invalid stored image data.",
                status_code=400,
                error_code="INVALID_IMAGE_DATA",
            ) from exc

    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        try:
            resp = await client.get(u)
        except httpx.RequestError as exc:
            logger.warning("share-image remote fetch failed: %s", exc)
            raise AppException(
                "Could not load image.",
                status_code=502,
                error_code="IMAGE_FETCH_FAILED",
            ) from exc
    if resp.status_code != 200:
        raise AppException(
            "Could not load image.",
            status_code=502,
            error_code="IMAGE_FETCH_FAILED",
        )
    body = resp.content
    mime = (resp.headers.get("content-type") or "image/jpeg").split(";")[0].strip()
    return body, mime


@router.post("", response_model=ClothesResponse, status_code=status.HTTP_201_CREATED)
async def create_clothes(
    body: ClothesCreate,
    db: DbSession,
    current_user: CurrentUser,
) -> Clothes:
    """Create a clothing item for the current user."""
    url = body.image_url.strip()
    needs_hints = (
        body.clothes_type is None or body.color is None or body.style is None
    )
    runtime = await get_system_settings(db)
    if needs_hints and not runtime.feature_ai_tagging:
        raise AppException(
            "AI tagging is disabled; provide type, color, and style in the request.",
            status_code=400,
            error_code="AI_TAGGING_DISABLED",
        )
    hints = (
        await asyncio.to_thread(analyze_image, url)
        if needs_hints
        else {"type": "", "color": "", "style": ""}
    )
    clothes_type = body.clothes_type
    if clothes_type is None:
        try:
            clothes_type = ClothesType(hints["type"])
        except ValueError:
            clothes_type = ClothesType.TOP
    color = (body.color.strip() if body.color else hints["color"]).strip()
    style = (body.style.strip() if body.style else hints["style"]).strip()
    if not color or not style:
        raise AppException(
            "Color and style must be non-empty after auto-tagging.",
            status_code=400,
            error_code="INVALID_CLOTHES_FIELDS",
        )
    item = Clothes(
        user_id=current_user.id,
        image_url=url,
        clothes_type=clothes_type,
        color=color,
        style=style,
        detection_confidence=body.detection_confidence,
    )
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return item


@router.post(
    "/upload",
    response_model=ClothesImageUploadResponse,
    summary="Upload a garment image",
    description="Multipart field ``file`` (JPEG, PNG, or WebP). Returns a public URL to pass to POST /clothes.",
)
async def upload_clothes_image(
    current_user: CurrentUser,
    file: UploadFile = File(..., description="Image file"),
) -> ClothesImageUploadResponse:
    data = await file.read()
    public_url = await upload_clothes_object(
        user_id=current_user.id,
        data=data,
        content_type=file.content_type,
    )
    return ClothesImageUploadResponse(url=public_url)


@router.get("/analyze", include_in_schema=False)
async def analyze_clothes_tags_get():
    """GET is not supported; use POST with multipart ``file``."""
    raise HTTPException(
        status_code=status.HTTP_405_METHOD_NOT_ALLOWED,
        detail="Use POST with multipart form field `file` (JPEG, PNG, or WebP).",
        headers={"Allow": "POST"},
    )


@router.post(
    "/analyze",
    response_model=ClothesAnalyzeResponse,
    summary="Analyze image for type/color/style",
    description="Requires **POST** with multipart form field ``file`` (image). No DB write.",
)
async def analyze_clothes_tags(
    db: DbSession,
    current_user: CurrentUser,
    file: UploadFile = File(..., description="Image file"),
    language: str = Query(
        default="en",
        description="Client UI language (en|hi); reserved for future prompt tuning",
        pattern="^(en|hi)$",
    ),
) -> ClothesAnalyzeResponse:
    _ = current_user
    _ = language
    runtime = await get_system_settings(db)
    if not runtime.feature_ai_tagging:
        raise AppException(
            "AI tagging is disabled.",
            status_code=400,
            error_code="AI_TAGGING_DISABLED",
        )
    data = await file.read()
    hints, source_tag = await asyncio.to_thread(analyze_garment_image, data)
    confidence = float(hints["confidence"])
    try:
        ctype = ClothesType(hints["type"])
    except ValueError:
        ctype = ClothesType.TOP
    color = (hints.get("color") or "").strip()
    style = (hints.get("style") or "").strip()
    if not color:
        color = "black"
    if not style:
        style = "casual"
    return ClothesAnalyzeResponse(
        type=ctype.value,
        color=color,
        style=style,
        confidence=confidence,
        source=source_tag,
    )


@router.post("/check-duplicate", response_model=ClothesDuplicateCheckResponse)
async def check_duplicate_clothes(
    body: ClothesDuplicateCheckRequest,
    db: DbSession,
    current_user: CurrentUser,
) -> ClothesDuplicateCheckResponse:
    """Suggest similar wardrobe items before save (non-blocking)."""
    raw: bytes | None = None
    if body.image_url:
        raw, _ = await _load_share_image_bytes(body.image_url)
    elif body.base64:
        try:
            raw = _decode_base64_payload(body.base64)
        except ValueError as exc:
            raise AppException(
                "Invalid base64 image.",
                status_code=400,
                error_code="INVALID_IMAGE_DATA",
            ) from exc
    if not raw:
        raise AppException(
            "Provide either image_url or base64.",
            status_code=400,
            error_code="INVALID_DUPLICATE_CHECK_INPUT",
        )

    result = await db.execute(select(Clothes).where(Clothes.user_id == current_user.id))
    items = list(result.scalars().all())
    similar = await asyncio.to_thread(
        detect_similar_clothes,
        raw,
        items,
        uploaded_type=body.clothes_type,
    )
    rows = [
        ClothesDuplicateItem(
            id=item.id,
            image_url=item.image_url,
            type=item.clothes_type.value,
            color=item.color,
            style=item.style,
        )
        for item in similar
    ]
    return ClothesDuplicateCheckResponse(
        is_duplicate=len(rows) > 0,
        similar_items=rows,
    )


@router.get("", response_model=ClothesListResponse)
async def list_clothes(
    db: DbSession,
    current_user: CurrentUser,
    limit: int = Query(default=20, ge=1, le=_MAX_PAGE_SIZE, description="Max items to return"),
    offset: int = Query(default=0, ge=0, description="Number of items to skip"),
) -> ClothesListResponse:
    """List the current user's clothes with pagination."""
    owner = Clothes.user_id == current_user.id
    count_stmt = select(func.count()).select_from(Clothes).where(owner)
    total = int((await db.execute(count_stmt)).scalar_one())

    stmt = (
        select(Clothes)
        .where(owner)
        .order_by(Clothes.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(stmt)
    items = list(result.scalars().all())
    return ClothesListResponse(
        items=[ClothesResponse.model_validate(row) for row in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/{clothes_id}/share-image",
    summary="Garment bytes for outfit share/export",
    description=(
        "Returns the image for this clothing row (owner only). "
        "Same-origin + auth so the browser can embed pixels when building a share poster "
        "(e.g. html-to-image) without S3 CORS."
    ),
    response_class=Response,
)
async def share_clothes_image(
    clothes_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> Response:
    result = await db.execute(
        select(Clothes).where(Clothes.id == clothes_id, Clothes.user_id == current_user.id),
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise AppException(
            "Clothing item not found.",
            status_code=404,
            error_code="CLOTHES_NOT_FOUND",
        )
    raw, mime = await _load_share_image_bytes(item.image_url)
    if len(raw) > _MAX_SHARE_IMAGE_BYTES:
        raise AppException(
            "Image is too large.",
            status_code=413,
            error_code="IMAGE_TOO_LARGE",
        )
    return Response(content=raw, media_type=mime or "application/octet-stream")


@router.delete("/{clothes_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_clothes(
    clothes_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> None:
    """Delete a clothing item; only the owner may delete it."""
    result = await db.execute(
        select(Clothes).where(Clothes.id == clothes_id, Clothes.user_id == current_user.id),
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise AppException(
            "Clothing item not found.",
            status_code=404,
            error_code="CLOTHES_NOT_FOUND",
        )
    await db.delete(item)
