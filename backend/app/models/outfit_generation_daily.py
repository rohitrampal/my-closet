"""Per-day outfit generation counts (for admin analytics)."""

from datetime import date

from sqlalchemy import Date, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class OutfitGenerationDaily(Base):
    __tablename__ = "outfit_generation_daily"

    stat_date: Mapped[date] = mapped_column(Date, primary_key=True)
    count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
