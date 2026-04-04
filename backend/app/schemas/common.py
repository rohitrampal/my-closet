"""Shared API schemas."""

from typing import Any

from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    """Single error item (e.g. validation field)."""

    loc: list[str] | None = None
    msg: str
    type: str | None = None


class ErrorResponse(BaseModel):
    """Standard API error envelope."""

    error: str = Field(..., description="Machine-readable error code")
    message: str = Field(..., description="Human-readable message")
    details: list[ErrorDetail] | None = None
    extra: dict[str, Any] | None = Field(default=None, description="Optional structured context")


class HealthResponse(BaseModel):
    """Health check payload."""

    status: str
    environment: str
