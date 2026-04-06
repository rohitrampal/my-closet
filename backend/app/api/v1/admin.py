"""Admin-only dashboard, user management, and runtime settings."""

import random

from fastapi import APIRouter, Query
from sqlalchemy import func, select

from app.dependencies.auth import CurrentAdmin
from app.dependencies.database import DbSession
from app.exceptions.app_exceptions import AppException
from app.models.analytics_event import AnalyticsEvent
from app.models.clothes import Clothes
from app.models.outfit_feedback import OutfitFeedback
from app.models.system_settings import SystemSettings
from app.models.user import User
from app.schemas.admin import (
    AdminAnalyticsResponse,
    AdminAnalyticsSummaryResponse,
    AdminDashboardResponse,
    AdminPremiumPatch,
    AdminSystemSettingsPatch,
    AdminSystemSettingsResponse,
    AdminTestOutfitRequest,
    AdminTestOutfitResponse,
    AdminUserItem,
    AdminUserListResponse,
    AdminVisionProviderStatItem,
    AdminVisionStatsResponse,
)
from app.schemas.clothes import ClothesResponse
from app.schemas.outfit import OutfitGenerateResponse
from app.services.admin_analytics import get_admin_analytics
from app.services.admin_audit import log_admin_action
from app.services.outfit_match_params import subscriber_match_kwargs
from app.services.outfit_matcher import (
    OutfitGenerationError,
    generate_outfit,
    outfit_matcher_debug_scores,
    scores_for_admin_preview,
)
from app.services.personalization import load_personalization_boosts
from app.services.clothes_vision_runtime import get_vision_runtime
from app.services.runtime_settings import get_system_settings

router = APIRouter()
_MAX_PAGE = 100

_EVENT_OUTFIT_SUCCESS = "outfit_generated_success"
_EVENT_UPGRADE_CLICK = "upgrade_clicked"
_EVENT_PAYMENT_SUCCESS = "payment_success"


@router.get("/vision-stats", response_model=AdminVisionStatsResponse)
async def admin_vision_stats(_admin: CurrentAdmin) -> AdminVisionStatsResponse:
    """In-process vision pipeline analytics (resets on API restart)."""
    raw = get_vision_runtime().admin_snapshot_payload()
    return AdminVisionStatsResponse(
        last_success_provider=raw["last_success_provider"],
        fast_path_hits_total=raw["fast_path_hits_total"],
        providers=[AdminVisionProviderStatItem(**row) for row in raw["providers"]],
    )


@router.get("/analytics-summary", response_model=AdminAnalyticsSummaryResponse)
async def admin_analytics_summary(db: DbSession, _admin: CurrentAdmin) -> AdminAnalyticsSummaryResponse:
    """Funnel stats from ingested client analytics events."""
    gen = int(
        (
            await db.execute(
                select(func.count()).select_from(AnalyticsEvent).where(AnalyticsEvent.event_name == _EVENT_OUTFIT_SUCCESS)
            )
        ).scalar_one()
    )
    upgrades = int(
        (
            await db.execute(
                select(func.count()).select_from(AnalyticsEvent).where(AnalyticsEvent.event_name == _EVENT_UPGRADE_CLICK)
            )
        ).scalar_one()
    )
    payments = int(
        (
            await db.execute(
                select(func.count()).select_from(AnalyticsEvent).where(AnalyticsEvent.event_name == _EVENT_PAYMENT_SUCCESS)
            )
        ).scalar_one()
    )
    rate = float(payments / upgrades) if upgrades else 0.0
    return AdminAnalyticsSummaryResponse(
        total_generates=gen,
        total_upgrades_clicked=upgrades,
        total_payments=payments,
        conversion_rate=rate,
    )


@router.post("/test-outfit", response_model=AdminTestOutfitResponse)
async def admin_test_outfit(
    body: AdminTestOutfitRequest,
    db: DbSession,
    admin: CurrentAdmin,
) -> AdminTestOutfitResponse:
    """
    Generate one outfit from the admin user's wardrobe (no cache, no analytics bump).
    Uses current system ML settings and personalization for the admin account.
    """
    runtime = await get_system_settings(db)
    match_kw = subscriber_match_kwargs(runtime, is_premium=admin.is_premium)
    result = await db.execute(select(Clothes).where(Clothes.user_id == admin.id))
    items = list(result.scalars().all())
    boosts = await load_personalization_boosts(db, admin.id)
    rng = random.Random()
    try:
        top, bottom, footwear, reasons = generate_outfit(
            items,
            body.occasion.value,
            body.weather.value,
            rng=rng,
            personalization=boosts,
            premium_mode=admin.is_premium,
            cache_user_id=None,
            language=body.language.value,
            **match_kw,
        )
    except OutfitGenerationError as exc:
        raise AppException(
            exc.message,
            status_code=400,
            error_code=exc.code,
        ) from None

    wardrobe_by_id = {c.id: c for c in items}
    rule_score, ml_score = scores_for_admin_preview(
        top,
        bottom,
        footwear,
        body.occasion.value,
        body.weather.value,
        personalization=boosts,
        premium_mode=admin.is_premium,
        pers_strength=match_kw["pers_strength"],
        ml_weight=match_kw["ml_weight"],
        repeat_user_id=admin.id,
        wardrobe_by_id=wardrobe_by_id,
    )
    score_debug = None
    if body.debug_scores:
        score_debug = outfit_matcher_debug_scores(
            top,
            bottom,
            footwear,
            body.occasion.value,
            body.weather.value,
            personalization=boosts,
            premium_mode=admin.is_premium,
            pers_strength=match_kw["pers_strength"],
            ml_weight=match_kw["ml_weight"],
            repeat_user_id=admin.id,
            wardrobe_by_id=wardrobe_by_id,
        )
    return AdminTestOutfitResponse(
        outfit=OutfitGenerateResponse(
            top=ClothesResponse.model_validate(top),
            bottom=ClothesResponse.model_validate(bottom) if bottom is not None else None,
            footwear=ClothesResponse.model_validate(footwear),
            reasons=reasons,
        ),
        ml_score=ml_score,
        rule_score=rule_score,
        score_debug=score_debug,
    )


@router.get("/analytics", response_model=AdminAnalyticsResponse)
async def admin_analytics(
    db: DbSession,
    _admin: CurrentAdmin,
    days: int = Query(default=30, ge=1, le=366, description="Number of trailing days including today"),
) -> AdminAnalyticsResponse:
    """Daily outfit generation counts and like-rate trend from feedback (UTC dates)."""
    return await get_admin_analytics(db, days=days)


@router.get("/dashboard", response_model=AdminDashboardResponse)
async def admin_dashboard(db: DbSession, _admin: CurrentAdmin) -> AdminDashboardResponse:
    total_users = int((await db.execute(select(func.count()).select_from(User))).scalar_one())
    settings = await get_system_settings(db)
    total_feedback = int((await db.execute(select(func.count()).select_from(OutfitFeedback))).scalar_one())
    likes = int(
        (await db.execute(select(func.count()).select_from(OutfitFeedback).where(OutfitFeedback.liked))).scalar_one()
    )
    like_rate = float(likes / total_feedback) if total_feedback else 0.0
    return AdminDashboardResponse(
        total_users=total_users,
        total_outfits_generated=int(settings.outfits_generated_total),
        like_rate=like_rate,
    )


@router.get("/users", response_model=AdminUserListResponse)
async def admin_list_users(
    db: DbSession,
    _admin: CurrentAdmin,
    limit: int = Query(default=20, ge=1, le=_MAX_PAGE),
    offset: int = Query(default=0, ge=0),
) -> AdminUserListResponse:
    count_stmt = select(func.count()).select_from(User)
    total = int((await db.execute(count_stmt)).scalar_one())
    stmt = select(User).order_by(User.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(stmt)
    rows = list(result.scalars().all())
    return AdminUserListResponse(
        items=[AdminUserItem.model_validate(r) for r in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.patch("/users/{user_id}/premium", response_model=AdminUserItem)
async def admin_toggle_premium(
    user_id: int,
    body: AdminPremiumPatch,
    db: DbSession,
    admin: CurrentAdmin,
) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise AppException("User not found.", status_code=404, error_code="USER_NOT_FOUND")
    old_premium = user.is_premium
    user.is_premium = body.is_premium
    await log_admin_action(
        db,
        admin.id,
        "user.premium.patch",
        {
            "target_user_id": user_id,
            "field": "is_premium",
            "old": old_premium,
            "new": body.is_premium,
        },
    )
    await db.flush()
    await db.refresh(user)
    return user


@router.get("/settings", response_model=AdminSystemSettingsResponse)
async def admin_get_settings(db: DbSession, _admin: CurrentAdmin) -> SystemSettings:
    return await get_system_settings(db)


@router.patch("/settings", response_model=AdminSystemSettingsResponse)
async def admin_patch_settings(
    body: AdminSystemSettingsPatch,
    db: DbSession,
    admin: CurrentAdmin,
) -> SystemSettings:
    row = await get_system_settings(db)
    data = body.model_dump(exclude_unset=True)
    for key, val in data.items():
        old_val = getattr(row, key)
        setattr(row, key, val)
        await log_admin_action(
            db,
            admin.id,
            "settings.patch",
            {"field": key, "old": old_val, "new": val},
        )
    await db.flush()
    await db.refresh(row)
    return row
