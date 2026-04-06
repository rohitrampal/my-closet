"""Clothing item schemas."""

from datetime import datetime

from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.models.clothes import ClothesType

# HTTP(S) URLs only — no inline base64 in API or DB.
_MAX_IMAGE_URL_CHARS = 2048


class ClothesCreate(BaseModel):
    """Create a clothing item. Omit type/color/style to infer from ``image_url`` (vision + URL heuristics)."""

    image_url: str = Field(
        ...,
        min_length=1,
        max_length=_MAX_IMAGE_URL_CHARS,
        description="Public https URL of the garment image (after upload to object storage)",
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
    detection_confidence: float | None = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Optional AI tag confidence when the item was saved from analyze flow",
    )

    @field_validator("image_url")
    @classmethod
    def http_url_only(cls, v: str) -> str:
        s = v.strip()
        low = s.lower()
        if low.startswith("data:") or low.startswith("javascript:"):
            raise ValueError("image_url must be an https URL, not an inline data or script URL")
        if not (low.startswith("https://") or low.startswith("http://")):
            raise ValueError("image_url must be an http(s) URL")
        return s


class ClothesImageUploadResponse(BaseModel):
    """Public URL after a successful Storage upload."""

    url: str = Field(..., min_length=1, max_length=_MAX_IMAGE_URL_CHARS)


class ClothesAnalyzeResponse(BaseModel):
    """Suggested tags from vision + heuristics (same shape as create merge)."""

    type: str = Field(..., description="ClothesType value string")
    color: str
    style: str
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Heuristic confidence for the suggestion (Gemini vs local)",
    )
    source: Literal[
        "gemini",
        "openai",
        "groq",
        "huggingface",
        "sarvam",
        "fallback",
    ] = Field(
        ...,
        description="Which vision provider produced the suggestion (multi-provider chain + local fallback)",
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
    detection_confidence: float | None = None
    created_at: datetime


class ClothesListResponse(BaseModel):
    """Paginated list of clothing items for the current user."""

    items: list[ClothesResponse]
    total: int = Field(..., ge=0, description="Total items for the current user")
    limit: int = Field(..., ge=1, description="Page size")
    offset: int = Field(..., ge=0, description="Number of items skipped")
