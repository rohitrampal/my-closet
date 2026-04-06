"""Public contact form (SMTP)."""

import logging

from fastapi import APIRouter, HTTPException, status

from app.config import get_settings
from app.schemas.contact import ContactRequest, ContactResponse
from app.services import email_service

logger = logging.getLogger(__name__)

router = APIRouter()


def _smtp_configured() -> bool:
    s = get_settings()
    return bool(
        s.SMTP_HOST
        and s.SMTP_USER
        and s.SMTP_PASSWORD
        and s.ADMIN_EMAIL
    )


@router.post("/contact", response_model=ContactResponse)
async def submit_contact(payload: ContactRequest) -> ContactResponse:
    """Validate input and email the admin."""
    if not _smtp_configured():
        logger.warning("contact_submission_rejected_smtp_not_configured")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Contact email is not configured.",
        )
    try:
        await email_service.send_contact_email(
            name=payload.name.strip(),
            email=str(payload.email),
            message=payload.message.strip(),
        )
    except Exception:
        logger.exception("contact_email_send_failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send message. Please try again later.",
        ) from None
    return ContactResponse()
