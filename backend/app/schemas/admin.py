"""Admin API schemas."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.outfit import Occasion, OutfitGenerateResponse, Weather


class AdminDashboardResponse(BaseModel):
    total_users: int
    total_outfits_generated: int
    like_rate: float = Field(..., description="Fraction of feedback rows that are likes (0..1)")


class AdminUserItem(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    email: str
    is_premium: bool
    is_admin: bool
    created_at: datetime


class AdminUserListResponse(BaseModel):
    items: list[AdminUserItem]
    total: int
    limit: int
    offset: int


class AdminPremiumPatch(BaseModel):
    is_premium: bool


class AdminSystemSettingsResponse(BaseModel):
    model_config = {"from_attributes": True}

    ml_exploration_rate: float
    ml_weight: float
    feature_ai_tagging: bool
    feature_stylist_mode: bool
    stylist_rollout_percentage: int = Field(
        ...,
        ge=0,
        le=100,
        description="Fraction of users (by stable hash) who get stylist when feature_stylist_mode is on",
    )
    outfits_generated_total: int


class AdminTestOutfitRequest(BaseModel):
    occasion: Occasion
    weather: Weather


class AdminTestOutfitResponse(BaseModel):
    outfit: OutfitGenerateResponse
    ml_score: float
    rule_score: float


class DailyGeneratePoint(BaseModel):
    date: str = Field(..., description="ISO calendar date YYYY-MM-DD")
    count: int = Field(..., ge=0)


class LikeRatePoint(BaseModel):
    date: str = Field(..., description="ISO calendar date YYYY-MM-DD")
    rate: float = Field(..., ge=0.0, le=1.0)


class AdminAnalyticsResponse(BaseModel):
    daily_generates: list[DailyGeneratePoint]
    like_rate_trend: list[LikeRatePoint]


class AdminSystemSettingsPatch(BaseModel):
    ml_exploration_rate: float | None = Field(
        default=None,
        ge=0.0,
        le=0.5,
        description="Must be between 0 and 0.5 inclusive (caps stochastic outfit exploration).",
    )
    ml_weight: float | None = Field(
        default=None,
        ge=0.0,
        le=10.0,
        description="Must be between 0 and 10 inclusive (ML bonus scale in the matcher).",
    )
    feature_ai_tagging: bool | None = None
    feature_stylist_mode: bool | None = None
    stylist_rollout_percentage: int | None = Field(
        default=None,
        ge=0,
        le=100,
        description="0–100; stable per-user hash bucket in [0,99] must be < this to use stylist",
    )
