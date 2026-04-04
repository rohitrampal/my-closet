"""SQLAlchemy models (import Base and concrete models for Alembic)."""

from app.models.base import Base
from app.models.admin_action import AdminAction
from app.models.clothes import Clothes, ClothesType
from app.models.outfit_feedback import OutfitFeedback
from app.models.outfit_generation_daily import OutfitGenerationDaily
from app.models.saved_outfit import SavedOutfit
from app.models.user import User
from app.models.system_settings import SystemSettings
from app.models.user_preference import UserPreference

__all__ = [
    "Base",
    "AdminAction",
    "User",
    "Clothes",
    "ClothesType",
    "OutfitFeedback",
    "OutfitGenerationDaily",
    "SavedOutfit",
    "SystemSettings",
    "UserPreference",
]
