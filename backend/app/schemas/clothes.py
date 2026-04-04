"""Clothing item schemas."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.models.clothes import ClothesType


class ClothesCreate(BaseModel):
    """Create a clothing item. Omit type/color/style to infer from ``image_url`` (vision + URL heuristics)."""

    image_url: str = Field(
        ...,
        min_length=1,
        max_length=2048,
        description="URL pointing to an image of the item (used for auto-tagging when fields are omitted)",
    )
    clothes_type: ClothesType | None = Field(
        default=None,
        description="Category; if omitted, inferred from image (optional HF) and URL/filename heuristics",
    )
    color: str | None = Field(
        default=None,
        max_length=100,
        description="Primary color; if omitted, dominant color from the downloaded image (fallback: URL heuristics)",
    )
    style: str | None = Field(
        default=None,
        max_length=100,
        description="Style; if omitted, simple pixel-based hint and URL heuristics (fallback: casual)",
    )


class ClothesResponse(BaseModel):
    """Single clothing item returned from the API."""

    model_config = {"from_attributes": True}

    id: int
    user_id: int
    image_url: str
    clothes_type: ClothesType
    color: str
    style: str
    created_at: datetime


class ClothesListResponse(BaseModel):
    """Paginated list of clothing items for the current user."""

    items: list[ClothesResponse]
    total: int = Field(..., ge=0, description="Total items for the current user")
    limit: int = Field(..., ge=1, description="Page size")
    offset: int = Field(..., ge=0, description="Number of items skipped")
