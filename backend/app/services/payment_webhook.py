"""Razorpay webhook verification and premium activation (server-to-server)."""

from __future__ import annotations

import json
import logging
from typing import Any, Literal

import razorpay
from razorpay.errors import SignatureVerificationError
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.models.razorpay_webhook_payment import RazorpayWebhookPayment
from app.models.user import User
from app.services.payment import allowed_premium_amounts_paise

logger = logging.getLogger(__name__)

# Utility only needs a client instance; webhook verification uses the passed secret, not key auth.
_dummy_razorpay = razorpay.Client(auth=("webhook", "webhook"))


def verify_webhook_signature_or_raise(
    *,
    raw_body: bytes,
    signature_header: str | None,
    webhook_secret: str,
) -> None:
    """Validate ``X-Razorpay-Signature`` against the exact raw body bytes (UTF-8)."""
    if not signature_header or not signature_header.strip():
        raise SignatureVerificationError("Missing X-Razorpay-Signature")
    body_str = raw_body.decode("utf-8")
    _dummy_razorpay.utility.verify_webhook_signature(
        body_str,
        signature_header.strip(),
        webhook_secret.strip(),
    )


def _payment_entity_from_event(payload: dict[str, Any]) -> dict[str, Any] | None:
    """Return the payment entity dict for ``payment.captured`` or ``None``."""
    if payload.get("event") != "payment.captured":
        return None
    block = (payload.get("payload") or {}).get("payment") or {}
    entity = block.get("entity")
    return entity if isinstance(entity, dict) else None


async def apply_payment_captured_webhook(
    db: AsyncSession,
    settings: Settings,
    payload: dict[str, Any],
) -> Literal["ignored", "duplicate", "processed", "skipped_invalid"]:
    """
    Handle a verified ``payment.captured`` payload.

    Returns:
        ignored — not a payment.captured event
        duplicate — payment id already processed
        processed — user upgraded
        skipped_invalid — bad payload / user / amount (logged, 2xx for Razorpay)
    """
    entity = _payment_entity_from_event(payload)
    if entity is None:
        return "ignored"

    payment_id = entity.get("id")
    order_id = entity.get("order_id")
    notes = entity.get("notes") if isinstance(entity.get("notes"), dict) else {}
    raw_amount = entity.get("amount")

    if not payment_id or not order_id:
        logger.warning("razorpay_webhook_missing_ids", extra={"payment_id": payment_id, "order_id": order_id})
        return "skipped_invalid"

    try:
        amount_paise = int(raw_amount)
    except (TypeError, ValueError):
        logger.warning("razorpay_webhook_bad_amount", extra={"amount": raw_amount})
        return "skipped_invalid"

    if amount_paise not in allowed_premium_amounts_paise(settings):
        logger.warning(
            "razorpay_webhook_amount_not_allowed",
            extra={"amount_paise": amount_paise, "allowed": list(allowed_premium_amounts_paise(settings))},
        )
        return "skipped_invalid"

    user_note = notes.get("user_id")
    if user_note is None or str(user_note).strip() == "":
        logger.warning("razorpay_webhook_missing_user_note", extra={"payment_id": payment_id})
        return "skipped_invalid"

    try:
        user_id = int(str(user_note).strip())
    except ValueError:
        logger.warning("razorpay_webhook_bad_user_id", extra={"user_note": user_note})
        return "skipped_invalid"

    purpose = notes.get("purpose")
    if (
        purpose is not None
        and str(purpose).strip() != ""
        and str(purpose) != "premium_monthly"
    ):
        logger.warning("razorpay_webhook_wrong_purpose", extra={"purpose": purpose, "payment_id": payment_id})
        return "skipped_invalid"

    res_user = await db.execute(select(User).where(User.id == user_id))
    user = res_user.scalar_one_or_none()
    if user is None:
        logger.error("razorpay_webhook_user_not_found", extra={"user_id": user_id, "payment_id": payment_id})
        return "skipped_invalid"

    stmt = (
        pg_insert(RazorpayWebhookPayment)
        .values(
            razorpay_payment_id=str(payment_id),
            user_id=user_id,
            razorpay_order_id=str(order_id),
            amount_paise=amount_paise,
        )
        .on_conflict_do_nothing(index_elements=["razorpay_payment_id"])
        .returning(RazorpayWebhookPayment.id)
    )
    new_id = (await db.execute(stmt)).scalar_one_or_none()
    if new_id is None:
        return "duplicate"

    user.is_premium = True
    await db.flush()
    logger.info(
        "razorpay_webhook_premium_granted",
        extra={"user_id": user_id, "payment_id": payment_id, "order_id": order_id},
    )
    return "processed"


def parse_webhook_json(raw_body: bytes) -> dict[str, Any]:
    try:
        data = json.loads(raw_body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValueError("Invalid webhook JSON") from exc
    if not isinstance(data, dict):
        raise ValueError("Webhook body must be a JSON object")
    return data
