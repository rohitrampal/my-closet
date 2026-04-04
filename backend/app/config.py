"""Application settings loaded from environment (Pydantic BaseSettings)."""

from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Environment-driven configuration."""

    model_config = SettingsConfigDict(
        env_file=".env",
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

    @field_validator("ENV")
    @classmethod
    def normalize_env(cls, v: str) -> str:
        return v.strip().lower()

    @property
    def cors_origin_list(self) -> list[str]:
        if self.CORS_ORIGINS.strip() == "*":
            return ["*"]
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    """Cached settings singleton for dependency injection."""
    return Settings()
