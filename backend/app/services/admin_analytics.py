"""Admin analytics time series (daily generations, like rate by day)."""

from datetime import UTC, date, datetime, timedelta

from sqlalchemy import Date, case, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.outfit_feedback import OutfitFeedback
from app.models.outfit_generation_daily import OutfitGenerationDaily
from app.schemas.admin import AdminAnalyticsResponse, DailyGeneratePoint, LikeRatePoint


def _utc_today() -> date:
    return datetime.now(UTC).date()


def _inclusive_date_range(start: date, end: date) -> list[date]:
    out: list[date] = []
    d = start
    while d <= end:
        out.append(d)
        d += timedelta(days=1)
    return out


async def get_admin_analytics(db: AsyncSession, *, days: int) -> AdminAnalyticsResponse:
    end = _utc_today()
    start = end - timedelta(days=days - 1)
    day_list = _inclusive_date_range(start, end)

    gen_result = await db.execute(
        select(OutfitGenerationDaily).where(
            OutfitGenerationDaily.stat_date >= start,
            OutfitGenerationDaily.stat_date <= end,
        )
    )
    gen_map = {row.stat_date: int(row.count) for row in gen_result.scalars()}

    fb_day = cast(OutfitFeedback.created_at, Date).label("d")
    likes_expr = func.coalesce(
        func.sum(case((OutfitFeedback.liked.is_(True), 1), else_=0)),
        0,
    )
    total_expr = func.count()
    fb_stmt = (
        select(fb_day, likes_expr.label("likes"), total_expr.label("total"))
        .where(cast(OutfitFeedback.created_at, Date) >= start)
        .where(cast(OutfitFeedback.created_at, Date) <= end)
        .group_by(fb_day)
        .order_by(fb_day)
    )
    fb_result = await db.execute(fb_stmt)
    rate_map: dict[date, float] = {}
    for row in fb_result.mappings():
        d = row["d"]
        total = int(row["total"])
        likes = int(row["likes"])
        rate_map[d] = min(1.0, float(likes / total)) if total else 0.0

    daily_generates = [
        DailyGeneratePoint(date=d.isoformat(), count=gen_map.get(d, 0)) for d in day_list
    ]
    like_rate_trend = [
        LikeRatePoint(date=d.isoformat(), rate=rate_map.get(d, 0.0)) for d in day_list
    ]
    return AdminAnalyticsResponse(
        daily_generates=daily_generates,
        like_rate_trend=like_rate_trend,
    )
