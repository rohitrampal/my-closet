"""Clothing item ORM model."""

import enum
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class ClothesType(str, enum.Enum):
    """Category of clothing item (stored as PostgreSQL ENUM)."""

    TOP = "top"
    BOTTOM = "bottom"
    DRESS = "dress"
    OUTERWEAR = "outerwear"
    FOOTWEAR = "footwear"
    ACCESSORY = "accessory"


class Clothes(Base):
    __tablename__ = "clothes"
    __table_args__ = (Index("ix_clothes_user_id", "user_id"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    image_url: Mapped[str] = mapped_column(String(2048), nullable=False)
    clothes_type: Mapped[ClothesType] = mapped_column(
        Enum(ClothesType, name="clothes_type_enum", native_enum=True),
        nullable=False,
    )
    color: Mapped[str] = mapped_column(String(100), nullable=False)
    style: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    user: Mapped["User"] = relationship("User", back_populates="clothes")
