"""User ORM model."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.admin_action import AdminAction
    from app.models.clothes import Clothes
    from app.models.outfit_feedback import OutfitFeedback
    from app.models.saved_outfit import SavedOutfit
    from app.models.user_preference import UserPreference


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_premium: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    is_admin: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    clothes: Mapped[list["Clothes"]] = relationship(
        "Clothes",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    outfit_feedback: Mapped[list["OutfitFeedback"]] = relationship(
        "OutfitFeedback",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    saved_outfits: Mapped[list["SavedOutfit"]] = relationship(
        "SavedOutfit",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    preference: Mapped["UserPreference | None"] = relationship(
        "UserPreference",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    admin_actions: Mapped[list["AdminAction"]] = relationship(
        "AdminAction",
        back_populates="admin_user",
    )
