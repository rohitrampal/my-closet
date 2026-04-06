"""SMTP email delivery (contact form)."""

import asyncio
import logging
import smtplib
from email.message import EmailMessage

from app.config import Settings, get_settings
from app.services.password_reset_email_html import password_reset_html, password_reset_plain_text

logger = logging.getLogger(__name__)

CONTACT_SUBJECT = "New Contact Message from My Closet"
RESET_SUBJECT = "Reset your My Closet password"


def _build_body(name: str, email: str, message: str) -> str:
    return (
        f"Name: {name}\n"
        f"Email: {email}\n"
        "\n"
        "Message:\n"
        f"{message}\n"
    )


def _send_contact_sync(settings: Settings, name: str, email: str, message: str) -> None:
    body = _build_body(name, email, message)
    msg = EmailMessage()
    msg["Subject"] = CONTACT_SUBJECT
    msg["From"] = settings.SMTP_USER
    msg["To"] = settings.ADMIN_EMAIL
    msg["Reply-To"] = email
    msg.set_content(body, charset="utf-8")

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30) as smtp:
        smtp.starttls()
        smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        smtp.send_message(msg)


async def send_contact_email(name: str, email: str, message: str) -> None:
    """Send contact form email to ADMIN_EMAIL via SMTP (TLS)."""
    settings = get_settings()
    await asyncio.to_thread(_send_contact_sync, settings, name, email, message)


def _send_password_reset_sync(settings: Settings, to_email: str, reset_url: str) -> None:
    msg = EmailMessage()
    msg["Subject"] = RESET_SUBJECT
    msg["From"] = settings.SMTP_USER
    msg["To"] = to_email
    msg.set_content(password_reset_plain_text(reset_url), charset="utf-8")
    msg.add_alternative(password_reset_html(reset_url), subtype="html", charset="utf-8")

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30) as smtp:
        smtp.starttls()
        smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        smtp.send_message(msg)


def smtp_configured(settings: Settings) -> bool:
    return bool(settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD)


async def send_password_reset_email(to_email: str, reset_url: str) -> None:
    """Send password-reset link to the user via SMTP (TLS)."""
    settings = get_settings()
    if not smtp_configured(settings):
        raise RuntimeError("SMTP is not configured")
    await asyncio.to_thread(_send_password_reset_sync, settings, to_email, reset_url)
