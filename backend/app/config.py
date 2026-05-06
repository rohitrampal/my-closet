"""Application settings loaded from environment (Pydantic BaseSettings)."""

from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Load backend/.env regardless of process cwd (e.g. uvicorn run from repo root).
_BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Environment-driven configuration."""

    model_config = SettingsConfigDict(
        env_file=str(_BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    DATABASE_URL: str = Field(
        ...,
        description="Async PostgreSQL URL, e.g. postgresql+asyncpg://user:pass@host:5432/db",
    )
    SECRET_KEY: str = Field(..., min_length=16, description="Secret for signing tokens and crypto")
    ENV: str = Field(default="dev", description="Environment name: dev, prod, etc.")

    CORS_ORIGINS: str = Field(
        default="*",
        description="Comma-separated origins, or * for allow all (dev only)",
    )
    LOG_LEVEL: str = Field(default="INFO", description="Root log level")

    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=30,
        ge=1,
        le=60 * 24 * 30,
        description="JWT access token lifetime in minutes",
    )

    # Optional: OpenAI-compatible API for NL stylist (parse + explanations)
    OPENAI_API_KEY: str | None = Field(
        default=None,
        description="If set, enables LLM parse + stylist copy; otherwise keyword parse + rule-based text",
    )
    OPENAI_BASE_URL: str = Field(
        default="https://api.openai.com/v1",
        description="Chat completions base URL (OpenAI or compatible proxy)",
    )
    OPENAI_MODEL: str = Field(
        default="gpt-4o-mini",
        description="Model id for stylist assistant calls",
    )
    OPENAI_VISION_MODEL: str | None = Field(
        default=None,
        description=(
            "Vision model for POST /clothes/analyze when Gemini fails or is unset; "
            "defaults to OPENAI_MODEL (use a vision-capable id, e.g. gpt-4o-mini)"
        ),
    )

    MEMORY_CACHE_TTL_SECONDS: int = Field(
        default=480,
        ge=60,
        le=3600,
        description="TTL for in-memory matcher / tagging caches (seconds); default 8 minutes",
    )
    MEMORY_CACHE_MAX_ENTRIES: int = Field(
        default=2048,
        ge=64,
        le=100_000,
        description="Max entries per in-memory cache bucket before LRU eviction",
    )

    OUTFIT_REPEAT_HISTORY_MAX: int = Field(
        default=5,
        ge=1,
        le=50,
        description="How many recent outfit triples to remember per user for repeat avoidance",
    )
    OUTFIT_REPEAT_HISTORY_TTL_SECONDS: int = Field(
        default=600,
        ge=60,
        le=3600,
        description="TTL for recent outfit keys (seconds); default 10 minutes",
    )
    OUTFIT_REPEAT_PENALTY: float = Field(
        default=2.0,
        ge=0.0,
        le=50.0,
        description="Score penalty when a candidate matches a recent outfit triple",
    )

    # S3 garment images (server-side credentials via default AWS chain; never expose keys to clients)
    AWS_S3_BUCKET: str | None = Field(
        default=None,
        description="Bucket name for uploads, e.g. clothes",
    )
    AWS_S3_REGION: str = Field(
        default="us-east-1",
        description="AWS region of the bucket",
    )
    AWS_S3_PUBLIC_BASE_URL: str | None = Field(
        default=None,
        description="Optional public URL prefix (CloudFront/custom domain), no trailing slash; "
        "default is virtual-hosted S3 URL",
    )
    AWS_ENDPOINT_URL_S3: str | None = Field(
        default=None,
        description="Optional S3 API endpoint (e.g. LocalStack http://localhost:4566)",
    )
    STORAGE_FALLBACK_TO_CLOUDINARY: bool = Field(
        default=False,
        description="If true, uploads fallback to Cloudinary when S3 has retryable failures",
    )
    CLOUDINARY_CLOUD_NAME: str | None = Field(
        default=None,
        description="Cloudinary cloud name (required when fallback is enabled)",
    )
    CLOUDINARY_API_KEY: str | None = Field(
        default=None,
        description="Cloudinary API key (required when fallback is enabled)",
    )
    CLOUDINARY_API_SECRET: str | None = Field(
        default=None,
        description="Cloudinary API secret (required when fallback is enabled)",
    )
    CLOUDINARY_FOLDER: str | None = Field(
        default="clothes",
        description="Optional Cloudinary folder prefix for uploaded garment images",
    )
    CLOUDINARY_UPLOAD_TIMEOUT_SECONDS: float = Field(
        default=20.0,
        ge=5.0,
        le=120.0,
        description="Timeout for Cloudinary upload API calls (seconds)",
    )

    GEMINI_API_KEY: str | None = Field(
        default=None,
        description="Google AI Studio key for Gemini Vision (garment tagging); optional — falls back to local vision",
    )
    GEMINI_MODEL: str = Field(
        default="gemini-2.0-flash",
        description=(
            "Gemini model id for clothes/analyze (google-genai SDK). "
            "Use ids from the current API (e.g. gemini-2.0-flash); bare gemini-1.5-flash often 404s."
        ),
    )
    GEMINI_DISABLED: bool = Field(
        default=False,
        description=(
            "If true, skip Gemini for clothes tagging (no API calls). "
            "Use when free-tier quota is exhausted: set OPENAI_API_KEY and rely on OpenAI vision, or fallback only."
        ),
    )

    VISION_STEP_TIMEOUT_SECONDS: float = Field(
        default=60.0,
        ge=10.0,
        le=180.0,
        description="Per-provider wall-clock timeout for POST /clothes/analyze cloud steps (Gemini, OpenAI, Groq, HF, Sarvam)",
    )
    VISION_MIN_ACCEPT_CONFIDENCE: float = Field(
        default=0.6,
        ge=0.0,
        le=1.0,
        description="Minimum model confidence to accept a cloud tag without trying the next provider",
    )
    VISION_CIRCUIT_FAILURE_THRESHOLD: int = Field(
        default=5,
        ge=1,
        le=50,
        description="Consecutive hard failures (timeout/empty) before opening circuit for that provider",
    )
    VISION_CIRCUIT_COOLDOWN_SECONDS: float = Field(
        default=600.0,
        ge=30.0,
        le=86_400.0,
        description="How long a tripped vision provider circuit stays open (seconds)",
    )
    VISION_FAST_PATH_ENABLED: bool = Field(
        default=True,
        description="If true, very flat / single-hue images skip cloud vision and use local tagging only",
    )
    VISION_FAST_PATH_EDGE_MAX: float = Field(
        default=12.0,
        ge=1.0,
        le=80.0,
        description="Max mean edge score (0–255 scale on 64px thumb) for fast-path local-only analyze",
    )
    VISION_FAST_PATH_COLOR_SHARE_MIN: float = Field(
        default=0.78,
        ge=0.5,
        le=1.0,
        description="Min fraction of pixels in the top 32-level RGB bucket for fast-path heuristic",
    )

    GROQ_API_KEY: str | None = Field(default=None, description="Groq API key for garment vision fallback (OpenAI-compatible)")
    GROQ_BASE_URL: str = Field(
        default="https://api.groq.com/openai/v1",
        description="Groq OpenAI-compatible API root",
    )
    GROQ_VISION_MODEL: str = Field(
        default="meta-llama/llama-4-scout-17b-16e-instruct",
        description=(
            "Groq vision-capable model id. Do not use llama-3.2-*-vision-preview (decommissioned); "
            "see Groq deprecations."
        ),
    )

    HF_API_TOKEN: str | None = Field(
        default=None,
        description="Hugging Face token for router vision (/v1/chat/completions); also used by optional HF classify in ai_tagging if set in env",
    )
    HF_VISION_BASE_URL: str = Field(
        default="https://router.huggingface.co/v1",
        description="HF OpenAI-compatible chat root for vision",
    )
    HF_VISION_MODEL: str = Field(
        default="Qwen/Qwen2-VL-2B-Instruct",
        description=(
            "HF Inference Router vision model id (chat completions). "
            "Llama vision checkpoints often require Meta license + enabled providers on your token; "
            "Qwen2-VL is widely routed — override if your account only exposes other VLMs."
        ),
    )

    SARVAM_API_KEY: str | None = Field(default=None, description="Sarvam API key (Bearer) for chat / garment fallback")
    SARVAM_BASE_URL: str = Field(
        default="https://api.sarvam.ai/v1",
        description="Sarvam API root",
    )
    SARVAM_MODEL: str = Field(
        default="sarvam-30b",
        description="Sarvam text model for pixel-hint fallback when multimodal chat fails",
    )
    SARVAM_VISION_MODEL: str | None = Field(
        default=None,
        description=(
            "Unused at runtime: Sarvam chat expects string message content, so garment tagging uses "
            "SARVAM_MODEL with local pixel hints only (no image in the request)."
        ),
    )

    RAZORPAY_KEY_ID: str | None = Field(
        default=None,
        description="Razorpay Key Id (public); required for payment endpoints",
    )
    RAZORPAY_KEY_SECRET: str | None = Field(
        default=None,
        description="Razorpay Key Secret; server-only, never expose to clients",
    )
    RAZORPAY_WEBHOOK_SECRET: str | None = Field(
        default=None,
        description="Razorpay webhook signing secret for POST /payment/webhook",
    )

    PRICING_MODE: str = Field(
        default="prod",
        description='Premium checkout amount selector: "test" (TEST_PRICE_INR) or "prod" (PREMIUM_PRICE_INR)',
    )
    PREMIUM_PRICE_INR: int = Field(
        default=49,
        ge=1,
        le=999_999,
        description="Production premium price in whole rupees (not paise)",
    )
    TEST_PRICE_INR: int = Field(
        default=1,
        ge=1,
        le=999_999,
        description="Test-mode premium price in whole rupees (not paise)",
    )

    # SMTP — POST /contact (optional; endpoint returns 503 if unset)
    SMTP_HOST: str | None = Field(
        default=None,
        description="SMTP server hostname, e.g. smtp.gmail.com",
    )
    SMTP_PORT: int = Field(
        default=587,
        ge=1,
        le=65535,
        description="SMTP port (587 typical for STARTTLS)",
    )
    SMTP_USER: str | None = Field(
        default=None,
        description="SMTP auth username (often full email)",
    )
    SMTP_PASSWORD: str | None = Field(
        default=None,
        description="SMTP password or app password",
    )
    ADMIN_EMAIL: str | None = Field(
        default=None,
        description="Inbox for contact form submissions",
    )
    FRONTEND_BASE_URL: str = Field(
        default="http://localhost:5173",
        description="SPA origin for password-reset links (no trailing slash)",
    )

    @field_validator("ENV")
    @classmethod
    def normalize_env(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator("PRICING_MODE")
    @classmethod
    def normalize_pricing_mode(cls, v: str) -> str:
        s = v.strip().lower()
        if s not in ("test", "prod"):
            raise ValueError('PRICING_MODE must be "test" or "prod"')
        return s

    @property
    def cors_origin_list(self) -> list[str]:
        if self.CORS_ORIGINS.strip() == "*":
            return ["*"]
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    """Cached settings singleton for dependency injection."""
    return Settings()
