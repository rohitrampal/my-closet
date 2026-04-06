"""Free-tier daily limits on outfit generation sessions."""

from datetime import UTC, date, datetime

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions.app_exceptions import AppException
from app.models.user import User
from app.models.user_outfit_generation_daily import UserOutfitGenerationDaily

FREE_DAILY_OUTFIT_GENERATIONS = 5


def _today_utc() -> date:
    return datetime.now(UTC).date()


async def get_user_outfits_generated_today(db: AsyncSession, user_id: int) -> int:
    d = _today_utc()
    result = await db.execute(
        select(UserOutfitGenerationDaily.count).where(
            UserOutfitGenerationDaily.user_id == user_id,
            UserOutfitGenerationDaily.stat_date == d,
        ),
    )
    v = result.scalar_one_or_none()
    return int(v or 0)


async def ensure_free_user_outfit_quota(db: AsyncSession, user: User, sessions: int = 1) -> None:
    if user.is_premium or sessions <= 0:
        return
    used = await get_user_outfits_generated_today(db, user.id)
    if used + sessions > FREE_DAILY_OUTFIT_GENERATIONS:
        raise AppException(
            "You've reached your daily outfit generation limit. Upgrade to Premium for unlimited generations.",
            status_code=429,
            error_code="OUTFIT_DAILY_LIMIT",
        )


async def snapshot_outfit_quota(db: AsyncSession, user: User) -> tuple[int, int | None]:
    """``(used_today, daily_limit)`` where limit is None for premium (unlimited)."""
    used = await get_user_outfits_generated_today(db, user.id)
    limit = None if user.is_premium else FREE_DAILY_OUTFIT_GENERATIONS
    return used, limit


async def record_user_outfit_generation_sessions(db: AsyncSession, user_id: int, sessions: int = 1) -> None:
    if sessions <= 0:
        return
    d = _today_utc()
    stmt = insert(UserOutfitGenerationDaily).values(
        user_id=user_id,
        stat_date=d,
        count=sessions,
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=["user_id", "stat_date"],
        set_={"count": UserOutfitGenerationDaily.count + stmt.excluded.count},
    )
    await db.execute(stmt)
