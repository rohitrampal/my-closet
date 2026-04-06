"""User-related request/response schemas."""

import re
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

_PASSWORD_MIN_LEN = 8
_PASSWORD_MAX_LEN = 128


class UserCreate(BaseModel):
    """Register a new account."""

    email: EmailStr = Field(..., description="Unique email address")
    password: str = Field(
        ...,
        min_length=_PASSWORD_MIN_LEN,
        max_length=_PASSWORD_MAX_LEN,
        description="Password (minimum 8 characters)",
    )

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not re.search(r"[A-Za-z]", v) or not re.search(r"\d", v):
            raise ValueError("Password must contain at least one letter and one number")
        return v


class UserLogin(BaseModel):
    """Credentials for JWT issuance."""

    email: EmailStr = Field(..., description="Account email")
    password: str = Field(..., min_length=1, description="Account password")


class UserResponse(BaseModel):
    """Public user profile (no secrets)."""

    model_config = {"from_attributes": True}

    id: int
    email: str
    is_premium: bool = False
    is_admin: bool = False
    created_at: datetime


class TokenResponse(BaseModel):
    """OAuth2-style bearer token payload."""

    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Token scheme")


class AuthSessionResponse(BaseModel):
    """Login / signup: token plus public user profile."""

    access_token: str
    token_type: str = Field(default="bearer")
    user: UserResponse


class ForgotPasswordRequest(BaseModel):
    """Request a password-reset email."""

    email: EmailStr = Field(..., description="Account email")


class ResetPasswordRequest(BaseModel):
    """Set a new password using the token from the reset email."""

    token: str = Field(..., min_length=10, description="JWT from the reset link")
    password: str = Field(
        ...,
        min_length=_PASSWORD_MIN_LEN,
        max_length=_PASSWORD_MAX_LEN,
        description="New password",
    )

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not re.search(r"[A-Za-z]", v) or not re.search(r"\d", v):
            raise ValueError("Password must contain at least one letter and one number")
        return v
