"""Clothes routes (authenticated, owner-scoped)."""

import asyncio

from fastapi import APIRouter, Query, status
from sqlalchemy import func, select

from app.dependencies.auth import CurrentUser
from app.dependencies.database import DbSession
from app.exceptions.app_exceptions import AppException
from app.models.clothes import Clothes, ClothesType
from app.schemas.clothes import ClothesCreate, ClothesListResponse, ClothesResponse
from app.services.ai_tagging import analyze_image
from app.services.runtime_settings import get_system_settings

router = APIRouter()

_MAX_PAGE_SIZE = 100


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
    )
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return item


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
