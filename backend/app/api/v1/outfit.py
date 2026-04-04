"""Outfit generation (rule-based) and feedback (personalization)."""

import hashlib

from fastapi import APIRouter, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.dependencies.auth import CurrentUser
from app.dependencies.database import DbSession
from app.exceptions.app_exceptions import AppException
from app.models.clothes import Clothes, ClothesType
from app.models.outfit_feedback import OutfitFeedback
from app.models.saved_outfit import SavedOutfit
from app.models.system_settings import SystemSettings
from app.schemas.clothes import ClothesResponse
from app.config import get_settings
from app.schemas.outfit import (
    OutfitAssistantRequest,
    OutfitAssistantResponse,
    OutfitFeedbackRequest,
    OutfitFeedbackResponse,
    OutfitGenerateRequest,
    OutfitGenerateResponse,
    OutfitStylistRequest,
    OutfitStylistResponse,
    SavedOutfitItemResponse,
    SavedOutfitSaveRequest,
    StylistOptionLabel,
    StylistOutfit,
    OutfitMode,
)
from app.services.outfit_matcher import OutfitGenerationError, generate_outfit
from app.services.personalization import increment_category_preferences, load_personalization_boosts
from app.services.feature_rollout import is_stylist_rollout_enabled_for_user
from app.services.runtime_settings import get_system_settings, increment_outfits_generated
from app.services.stylist_llm import (
    fallback_explanation,
    llm_explain_outfit,
    parse_natural_outfit_query,
)

router = APIRouter()


def _ml_kwargs_from_settings(row: SystemSettings) -> dict[str, float]:
    return {
        "ml_explore_prob": float(row.ml_exploration_rate),
        "ml_weight": float(row.ml_weight),
    }


def _require_stylist_for_user(runtime: SystemSettings, user_id: int) -> None:
    if not runtime.feature_stylist_mode:
        raise AppException(
            "Stylist mode is temporarily disabled.",
            status_code=503,
            error_code="STYLIST_DISABLED",
        )
    if not is_stylist_rollout_enabled_for_user(user_id, runtime.stylist_rollout_percentage):
        raise AppException(
            "Stylist mode is not enabled for your account at this time.",
            status_code=403,
            error_code="STYLIST_ROLLOUT",
        )


def _validate_feedback_clothes(
    top: Clothes,
    bottom: Clothes | None,
    footwear: Clothes,
) -> None:
    if top.clothes_type not in (ClothesType.TOP, ClothesType.DRESS):
        raise AppException(
            "top_id must refer to a top or dress.",
            status_code=422,
            error_code="INVALID_OUTFIT_SHAPE",
        )
    if bottom is None:
        if top.clothes_type != ClothesType.DRESS:
            raise AppException(
                "bottom_id is required when the top is not a dress.",
                status_code=422,
                error_code="INVALID_OUTFIT_SHAPE",
            )
    elif bottom.clothes_type != ClothesType.BOTTOM:
        raise AppException(
            "bottom_id must refer to a bottom piece.",
            status_code=422,
            error_code="INVALID_OUTFIT_SHAPE",
        )
    if footwear.clothes_type != ClothesType.FOOTWEAR:
        raise AppException(
            "footwear_id must refer to a footwear item.",
            status_code=422,
            error_code="INVALID_OUTFIT_SHAPE",
        )


@router.post("/generate", response_model=OutfitGenerateResponse)
async def generate_outfit_endpoint(
    body: OutfitGenerateRequest,
    db: DbSession,
    current_user: CurrentUser,
) -> OutfitGenerateResponse:
    """
    Build one outfit from the user's wardrobe using color, style, occasion, and weather rules.

    Use ``mode: \"premium\"`` for stronger style/color weighting and deterministic picks (requires ``is_premium``).

    Taste scores come from feedback with recency decay (recent likes/dislikes matter more).
    """
    if body.mode == OutfitMode.premium and not current_user.is_premium:
        raise AppException(
            "Premium subscription required for premium outfit mode.",
            status_code=403,
            error_code="PREMIUM_REQUIRED",
        )
    use_premium_matcher = body.mode == OutfitMode.premium and current_user.is_premium

    result = await db.execute(select(Clothes).where(Clothes.user_id == current_user.id))
    items = list(result.scalars().all())
    boosts = await load_personalization_boosts(db, current_user.id)
    runtime = await get_system_settings(db)
    try:
        top, bottom, footwear, reasons = generate_outfit(
            items,
            body.occasion.value,
            body.weather.value,
            personalization=boosts,
            premium_mode=use_premium_matcher,
            cache_user_id=current_user.id,
            **_ml_kwargs_from_settings(runtime),
        )
    except OutfitGenerationError:
        raise AppException(
            "Add more clothes to generate outfits",
            status_code=400,
            error_code="OUTFIT_INSUFFICIENT",
        ) from None
    await increment_outfits_generated(db, 1)
    return OutfitGenerateResponse(
        top=ClothesResponse.model_validate(top),
        bottom=ClothesResponse.model_validate(bottom) if bottom is not None else None,
        footwear=ClothesResponse.model_validate(footwear),
        reasons=reasons,
    )


@router.post("/assistant", response_model=OutfitAssistantResponse)
async def outfit_assistant_endpoint(
    body: OutfitAssistantRequest,
    db: DbSession,
    current_user: CurrentUser,
) -> OutfitAssistantResponse:
    """
    Generate one outfit from natural language: infer occasion, vibe, and optional weather,
    run the rule-based matcher, then add a stylist explanation (LLM when ``OPENAI_API_KEY`` is set).
    """
    runtime = await get_system_settings(db)
    _require_stylist_for_user(runtime, current_user.id)
    if body.mode == OutfitMode.premium and not current_user.is_premium:
        raise AppException(
            "Premium subscription required for premium outfit mode.",
            status_code=403,
            error_code="PREMIUM_REQUIRED",
        )
    settings = get_settings()
    parsed = await parse_natural_outfit_query(body.query, settings)

    result = await db.execute(select(Clothes).where(Clothes.user_id == current_user.id))
    items = list(result.scalars().all())
    boosts = await load_personalization_boosts(db, current_user.id)
    use_premium = body.mode == OutfitMode.premium and current_user.is_premium

    import random

    rng = random.Random(
        (current_user.id + 11) * 100_003 + hash(body.query.strip()) % 1_000_000,
    )
    weather_val = parsed.weather.value if parsed.weather is not None else None
    q_digest = hashlib.sha256(body.query.strip().encode("utf-8")).hexdigest()[:24]

    try:
        top, bottom, footwear, reasons = generate_outfit(
            items,
            parsed.occasion.value,
            weather_val,
            rng=rng,
            personalization=boosts,
            premium_mode=use_premium,
            vibe=parsed.vibe,
            selection_tier="balanced",
            cache_user_id=current_user.id,
            cache_extra=f"q{q_digest}",
            **_ml_kwargs_from_settings(runtime),
        )
    except OutfitGenerationError:
        raise AppException(
            "Add more clothes to generate outfits",
            status_code=400,
            error_code="OUTFIT_INSUFFICIENT",
        ) from None

    await increment_outfits_generated(db, 1)

    expl = await llm_explain_outfit(
        body.query,
        top,
        bottom,
        footwear,
        reasons,
        settings,
    )
    if expl is None:
        expl = fallback_explanation(reasons)

    outfit = StylistOutfit(
        top=ClothesResponse.model_validate(top),
        bottom=ClothesResponse.model_validate(bottom) if bottom is not None else None,
        footwear=ClothesResponse.model_validate(footwear),
    )
    return OutfitAssistantResponse(outfit=outfit, explanation=expl)


@router.post("/stylist", response_model=OutfitStylistResponse)
async def stylist_outfits_endpoint(
    body: OutfitStylistRequest,
    db: DbSession,
    current_user: CurrentUser,
) -> OutfitStylistResponse:
    """
    Generate three outfit options for the same occasion + vibe.

    Tiers:
    - safe (high match) -> Minimal
    - balanced -> Trendy
    - experimental -> Bold
    """
    runtime = await get_system_settings(db)
    _require_stylist_for_user(runtime, current_user.id)
    result = await db.execute(select(Clothes).where(Clothes.user_id == current_user.id))
    items = list(result.scalars().all())
    boosts = await load_personalization_boosts(db, current_user.id)

    use_premium_matcher = current_user.is_premium

    tiers: list[tuple[str, StylistOptionLabel]] = [
        ("safe", StylistOptionLabel.minimal),
        ("balanced", StylistOptionLabel.trendy),
        ("experimental", StylistOptionLabel.bold),
    ]

    seen: set[tuple[int, int, int]] = set()
    options: list[dict] = []

    import random

    base_seed = (current_user.id + 1) * 10_000 + hash(body.vibe) % 10_000 + hash(body.occasion.value) % 10_000

    try:
        for tier_index, (tier, label) in enumerate(tiers):
            selected = None
            selected_key: tuple[int, int, int] | None = None

            # Try to avoid duplicates between tiers.
            for attempt in range(3):
                rng = random.Random(base_seed + tier_index * 100 + attempt * 17)
                premium_mode = use_premium_matcher if tier == "safe" else False

                top, bottom, footwear, _reasons = generate_outfit(
                    items,
                    body.occasion.value,
                    None,
                    rng=rng,
                    personalization=boosts,
                    premium_mode=premium_mode,
                    vibe=body.vibe,
                    selection_tier=tier,
                    cache_user_id=current_user.id,
                    cache_extra=f"t{tier_index}_a{attempt}",
                    **_ml_kwargs_from_settings(runtime),
                )

                key = (top.id, bottom.id if bottom is not None else 0, footwear.id)
                if key not in seen:
                    selected = (top, bottom, footwear)
                    selected_key = key
                    break

            if selected is None or selected_key is None:
                # Fallback: accept last generated combo.
                top, bottom, footwear, _reasons = generate_outfit(
                    items,
                    body.occasion.value,
                    None,
                    rng=random.Random(base_seed + tier_index * 100),
                    personalization=boosts,
                    premium_mode=use_premium_matcher if tier == "safe" else False,
                    vibe=body.vibe,
                    selection_tier=tier,
                    cache_user_id=current_user.id,
                    cache_extra=f"t{tier_index}_a{attempt}_fb",
                    **_ml_kwargs_from_settings(runtime),
                )
                selected = (top, bottom, footwear)
                selected_key = (top.id, bottom.id if bottom is not None else 0, footwear.id)

            seen.add(selected_key)
            top, bottom, footwear = selected

            options.append(
                {
                    "label": label,
                    "outfit": {
                        "top": ClothesResponse.model_validate(top),
                        "bottom": ClothesResponse.model_validate(bottom)
                        if bottom is not None
                        else None,
                        "footwear": ClothesResponse.model_validate(footwear),
                    },
                }
            )
    except OutfitGenerationError:
        raise AppException(
            "Add more clothes to generate outfits",
            status_code=400,
            error_code="OUTFIT_INSUFFICIENT",
        ) from None

    await increment_outfits_generated(db, 3)
    return OutfitStylistResponse(options=options)


@router.post("/feedback", response_model=OutfitFeedbackResponse, status_code=status.HTTP_201_CREATED)
async def submit_outfit_feedback(
    body: OutfitFeedbackRequest,
    db: DbSession,
    current_user: CurrentUser,
) -> OutfitFeedback:
    """Store like/dislike for an outfit triple to bias future generations."""
    ids: set[int] = {body.top_id, body.footwear_id}
    if body.bottom_id is not None:
        ids.add(body.bottom_id)
    result = await db.execute(
        select(Clothes).where(Clothes.id.in_(ids), Clothes.user_id == current_user.id),
    )
    found = {c.id: c for c in result.scalars().all()}
    if len(found) != len(ids):
        raise AppException(
            "One or more items were not found or do not belong to you.",
            status_code=404,
            error_code="CLOTHES_NOT_FOUND",
        )
    top = found[body.top_id]
    footwear = found[body.footwear_id]
    bottom = found[body.bottom_id] if body.bottom_id is not None else None
    _validate_feedback_clothes(top, bottom, footwear)

    row = OutfitFeedback(
        user_id=current_user.id,
        liked=body.liked,
        top_id=body.top_id,
        bottom_id=body.bottom_id,
        footwear_id=body.footwear_id,
    )
    db.add(row)
    await db.flush()
    outfit_items = [top, footwear]
    if bottom is not None:
        outfit_items.insert(1, bottom)
    await increment_category_preferences(db, current_user.id, outfit_items, liked=body.liked)
    await db.refresh(row)
    return row


def _saved_outfit_to_response(row: SavedOutfit) -> SavedOutfitItemResponse:
    return SavedOutfitItemResponse(
        id=row.id,
        created_at=row.created_at,
        top=ClothesResponse.model_validate(row.top),
        bottom=ClothesResponse.model_validate(row.bottom) if row.bottom is not None else None,
        footwear=ClothesResponse.model_validate(row.footwear),
    )


@router.post("/save", response_model=SavedOutfitItemResponse, status_code=status.HTTP_201_CREATED)
async def save_outfit(
    body: SavedOutfitSaveRequest,
    db: DbSession,
    current_user: CurrentUser,
) -> SavedOutfitItemResponse:
    """Persist the current outfit triple for the user (bookmark)."""
    ids: set[int] = {body.top_id, body.footwear_id}
    if body.bottom_id is not None:
        ids.add(body.bottom_id)
    result = await db.execute(
        select(Clothes).where(Clothes.id.in_(ids), Clothes.user_id == current_user.id),
    )
    found = {c.id: c for c in result.scalars().all()}
    if len(found) != len(ids):
        raise AppException(
            "One or more items were not found or do not belong to you.",
            status_code=404,
            error_code="CLOTHES_NOT_FOUND",
        )
    top = found[body.top_id]
    footwear = found[body.footwear_id]
    bottom = found[body.bottom_id] if body.bottom_id is not None else None
    _validate_feedback_clothes(top, bottom, footwear)

    row = SavedOutfit(
        user_id=current_user.id,
        top_id=body.top_id,
        bottom_id=body.bottom_id,
        footwear_id=body.footwear_id,
    )
    db.add(row)
    await db.flush()
    result2 = await db.execute(
        select(SavedOutfit)
        .where(SavedOutfit.id == row.id)
        .options(
            selectinload(SavedOutfit.top),
            selectinload(SavedOutfit.bottom),
            selectinload(SavedOutfit.footwear),
        ),
    )
    loaded = result2.scalar_one()
    return _saved_outfit_to_response(loaded)


@router.get("/saved", response_model=list[SavedOutfitItemResponse])
async def list_saved_outfits(
    db: DbSession,
    current_user: CurrentUser,
) -> list[SavedOutfitItemResponse]:
    """List saved outfits for the current user (newest first)."""
    result = await db.execute(
        select(SavedOutfit)
        .where(SavedOutfit.user_id == current_user.id)
        .options(
            selectinload(SavedOutfit.top),
            selectinload(SavedOutfit.bottom),
            selectinload(SavedOutfit.footwear),
        )
        .order_by(SavedOutfit.created_at.desc()),
    )
    rows = list(result.scalars().all())
    return [_saved_outfit_to_response(r) for r in rows]


@router.delete("/saved/{saved_outfit_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_saved_outfit(
    saved_outfit_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> None:
    """Remove a saved outfit owned by the current user."""
    result = await db.execute(
        select(SavedOutfit).where(
            SavedOutfit.id == saved_outfit_id,
            SavedOutfit.user_id == current_user.id,
        ),
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise AppException(
            "Saved outfit not found.",
            status_code=404,
            error_code="SAVED_OUTFIT_NOT_FOUND",
        )
    await db.delete(row)
