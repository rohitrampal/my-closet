"""Singleton runtime settings row (id=1) for ML tuning and feature flags."""

from sqlalchemy import BigInteger, Boolean, Float, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class SystemSettings(Base):
    __tablename__ = "system_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ml_exploration_rate: Mapped[float] = mapped_column(Float, nullable=False, default=0.2, server_default="0.2")
    ml_weight: Mapped[float] = mapped_column(Float, nullable=False, default=4.0, server_default="4.0")
    feature_ai_tagging: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    feature_stylist_mode: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )
    stylist_rollout_percentage: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=100,
        server_default="100",
    )
    outfits_generated_total: Mapped[int] = mapped_column(
        BigInteger, nullable=False, default=0, server_default="0"
    )
