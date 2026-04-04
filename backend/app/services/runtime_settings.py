"""Load and update singleton system_settings (id=1)."""

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.outfit_generation_daily import OutfitGenerationDaily
from app.models.system_settings import SystemSettings

_SETTINGS_ROW_ID = 1


async def get_system_settings(db: AsyncSession) -> SystemSettings:
    result = await db.execute(select(SystemSettings).where(SystemSettings.id == _SETTINGS_ROW_ID))
    row = result.scalar_one_or_none()
    if row is None:
        row = SystemSettings(id=_SETTINGS_ROW_ID)
        db.add(row)
        await db.flush()
        await db.refresh(row)
    return row


async def increment_outfits_generated(db: AsyncSession, count: int) -> None:
    if count <= 0:
        return
    row = await get_system_settings(db)
    row.outfits_generated_total = int(row.outfits_generated_total) + count

    stat_date = datetime.now(UTC).date()
    upsert = insert(OutfitGenerationDaily).values(stat_date=stat_date, count=count)
    upsert = upsert.on_conflict_do_update(
        index_elements=["stat_date"],
        set_={"count": OutfitGenerationDaily.count + upsert.excluded.count},
    )
    await db.execute(upsert)
