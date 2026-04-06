"""Schemas for client analytics ingestion."""

from pydantic import BaseModel, Field, field_validator


class AnalyticsEventIn(BaseModel):
    event_name: str = Field(..., min_length=1, max_length=128)
    metadata: dict = Field(default_factory=dict)

    @field_validator("event_name")
    @classmethod
    def strip_event_name(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("event_name must not be empty")
        return s
