"""Outfit generation API schemas."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field

from app.schemas.clothes import ClothesResponse


class Occasion(str, Enum):
    casual = "casual"
    party = "party"
    wedding = "wedding"


class Weather(str, Enum):
    hot = "hot"
    cold = "cold"


class OutfitMode(str, Enum):
    free = "free"
    premium = "premium"


class OutfitGenerateRequest(BaseModel):
    """Context for rule-based outfit matching."""

    occasion: Occasion = Field(..., description="Social context")
    weather: Weather = Field(..., description="Temperature context")
    mode: OutfitMode = Field(
        default=OutfitMode.free,
        description="Premium mode: stronger style/color weighting and deterministic picks (requires subscription)",
    )


class OutfitGenerateResponse(BaseModel):
    """One generated outfit (bottom omitted when the upper piece is a dress)."""

    top: ClothesResponse = Field(..., description="Top or dress")
    bottom: ClothesResponse | None = Field(
        default=None,
        description="Bottom piece; null when `top` is a dress",
    )
    footwear: ClothesResponse = Field(..., description="Shoes or boots")
    reasons: list[str] = Field(
        default_factory=list,
        description="Why this outfit works (color, style, weather, occasion)",
    )


class OutfitFeedbackRequest(BaseModel):
    """Record feedback for a specific combination of wardrobe item IDs."""

    top_id: int = Field(..., description="Top or dress item id")
    bottom_id: int | None = Field(
        default=None,
        description="Bottom id; omit or null when the top is a dress",
    )
    footwear_id: int = Field(..., description="Footwear item id")
    liked: bool = Field(..., description="True if the user liked this combination")


class OutfitFeedbackResponse(BaseModel):
    """Acknowledgement of stored feedback."""

    model_config = {"from_attributes": True}

    id: int
    liked: bool
    created_at: datetime


class OutfitStylistRequest(BaseModel):
    """Inputs for stylist mode."""

    occasion: Occasion = Field(..., description="Social context")
    vibe: str = Field(..., min_length=1, max_length=50, description="Overall vibe direction (e.g. classy)")


class StylistOutfit(BaseModel):
    """Outfit triple without feedback metadata."""

    top: ClothesResponse = Field(..., description="Top or dress")
    bottom: ClothesResponse | None = Field(
        default=None,
        description="Bottom piece; null when `top` is a dress",
    )
    footwear: ClothesResponse = Field(..., description="Shoes or boots")


class StylistOptionLabel(str, Enum):
    minimal = "Minimal"
    trendy = "Trendy"
    bold = "Bold"


class StylistOption(BaseModel):
    label: StylistOptionLabel
    outfit: StylistOutfit


class OutfitStylistResponse(BaseModel):
    options: list[StylistOption]


class OutfitAssistantRequest(BaseModel):
    """Natural-language outfit request (e.g. \"casual college outfit for hot day\")."""

    query: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="Describe the outfit you want; occasion, vibe, and weather are inferred",
    )
    mode: OutfitMode = Field(
        default=OutfitMode.free,
        description="Premium: stronger matching when user has subscription",
    )


class OutfitAssistantResponse(BaseModel):
    """Generated outfit plus a stylist explanation (LLM when configured)."""

    outfit: StylistOutfit
    explanation: str = Field(..., description="Why this outfit fits the request")


class SavedOutfitSaveRequest(BaseModel):
    """Bookmark an outfit by wardrobe item ids (same shape rules as feedback)."""

    top_id: int = Field(..., description="Top or dress item id")
    bottom_id: int | None = Field(
        default=None,
        description="Bottom id; omit or null when the top is a dress",
    )
    footwear_id: int = Field(..., description="Footwear item id")


class SavedOutfitItemResponse(BaseModel):
    """One saved outfit with resolved clothing rows."""

    model_config = {"from_attributes": True}

    id: int
    created_at: datetime
    top: ClothesResponse
    bottom: ClothesResponse | None
    footwear: ClothesResponse
