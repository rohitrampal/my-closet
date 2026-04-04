"""Aggregated taste profile derived from outfit feedback (frequency maps)."""

from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class UserPreference(Base):
    """One row per user: JSON frequency maps for colors, styles, and style categories."""

    __tablename__ = "user_preferences"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    preferred_colors: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    preferred_styles: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    disliked_colors: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    disliked_styles: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    preferred_categories: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    disliked_categories: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user: Mapped["User"] = relationship("User", back_populates="preference")
