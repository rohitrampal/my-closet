"""Contact form API schemas."""

from pydantic import BaseModel, EmailStr, Field


class ContactRequest(BaseModel):
    """Public contact form submission."""

    name: str = Field(..., min_length=1, max_length=200)
    email: EmailStr
    message: str = Field(..., min_length=1, max_length=20_000)


class ContactResponse(BaseModel):
    """Successful contact submission."""

    success: bool = True
