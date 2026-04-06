"""Admin API schemas."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.outfit import Occasion, OutfitGenerateResponse, OutfitLanguage, Weather


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
    language: OutfitLanguage = Field(
        default=OutfitLanguage.en,
        description="Language for matcher reason lines in the preview response",
    )
    debug_scores: bool = Field(
        default=False,
        description="When true, include score breakdown for matcher diagnostics",
    )


class AdminTestOutfitResponse(BaseModel):
    outfit: OutfitGenerateResponse
    ml_score: float
    rule_score: float
    score_debug: dict[str, float | str] | None = Field(
        default=None,
        description="Populated when debug_scores was true on the request",
    )


class DailyGeneratePoint(BaseModel):
    date: str = Field(..., description="ISO calendar date YYYY-MM-DD")
    count: int = Field(..., ge=0)


class LikeRatePoint(BaseModel):
    date: str = Field(..., description="ISO calendar date YYYY-MM-DD")
    rate: float = Field(..., ge=0.0, le=1.0)


class AdminAnalyticsResponse(BaseModel):
    daily_generates: list[DailyGeneratePoint]
    like_rate_trend: list[LikeRatePoint]


class AdminAnalyticsSummaryResponse(BaseModel):
    """Aggregates from ``analytics_events`` (client-tracked funnel)."""

    total_generates: int = Field(..., ge=0, description="Count of outfit_generated_success events")
    total_upgrades_clicked: int = Field(..., ge=0)
    total_payments: int = Field(..., ge=0)
    conversion_rate: float = Field(
        ...,
        ge=0.0,
        description="total_payments / total_upgrades_clicked when upgrades > 0, else 0 (can exceed 1 if clicks are under-counted)",
    )


class AdminVisionProviderStatItem(BaseModel):
    """Per-provider counters for POST /clothes/analyze (in-process only)."""

    provider: str
    success_count: int = 0
    fail_count: int = 0
    low_confidence_rejects: int = 0
    avg_latency_ms: float | None = Field(
        default=None,
        description="Mean latency (ms) of successful cloud calls for this provider",
    )
    consecutive_failures: int = 0
    circuit_open: bool = False
    circuit_remaining_sec: float | None = Field(
        default=None,
        description="Seconds until circuit closes (if circuit_open)",
    )


class AdminVisionStatsResponse(BaseModel):
    """Debug snapshot of the multi-provider vision pipeline (admin only)."""

    last_success_provider: str | None = Field(
        default=None,
        description="Last cloud provider that produced an accepted or best-effort result",
    )
    fast_path_hits_total: int = Field(
        default=0,
        description="How many requests used the local-only fast path heuristic",
    )
    providers: list[AdminVisionProviderStatItem]


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
