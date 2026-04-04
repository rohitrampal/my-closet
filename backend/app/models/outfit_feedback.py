"""Stored like/dislike signals for generated outfits (personalization)."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class OutfitFeedback(Base):
    __tablename__ = "outfit_feedback"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    liked: Mapped[bool] = mapped_column(Boolean, nullable=False)

    top_id: Mapped[int] = mapped_column(
        ForeignKey("clothes.id", ondelete="CASCADE"),
        nullable=False,
    )
    bottom_id: Mapped[int | None] = mapped_column(
        ForeignKey("clothes.id", ondelete="CASCADE"),
        nullable=True,
    )
    footwear_id: Mapped[int] = mapped_column(
        ForeignKey("clothes.id", ondelete="CASCADE"),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    user: Mapped["User"] = relationship("User", back_populates="outfit_feedback")
