"""User-saved outfit combinations (bookmarking)."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.clothes import Clothes
    from app.models.user import User


class SavedOutfit(Base):
    __tablename__ = "saved_outfits"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
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

    user: Mapped["User"] = relationship("User", back_populates="saved_outfits")
    top: Mapped["Clothes"] = relationship("Clothes", foreign_keys=[top_id])
    bottom: Mapped["Clothes | None"] = relationship("Clothes", foreign_keys=[bottom_id])
    footwear: Mapped["Clothes"] = relationship("Clothes", foreign_keys=[footwear_id])
