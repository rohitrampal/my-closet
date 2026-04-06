"""Razorpay orders and payment verification for premium checkout."""

from __future__ import annotations

import logging
import uuid
from typing import Any

import razorpay
from razorpay.errors import BadRequestError, ServerError, SignatureVerificationError

from app.config import Settings

logger = logging.getLogger(__name__)

PREMIUM_CURRENCY = "INR"


def get_active_price(settings: Settings) -> int:
    """Whole rupees charged for premium, based on ``PRICING_MODE``."""
    if settings.PRICING_MODE == "test":
        return settings.TEST_PRICE_INR
    return settings.PREMIUM_PRICE_INR


def allowed_premium_amounts_paise(settings: Settings) -> set[int]:
    """Valid Razorpay order totals we ever issue (test + prod catalog)."""
    return {settings.TEST_PRICE_INR * 100, settings.PREMIUM_PRICE_INR * 100}


def _client(settings: Settings) -> Any:
    key_id = (settings.RAZORPAY_KEY_ID or "").strip()
    key_secret = (settings.RAZORPAY_KEY_SECRET or "").strip()
    if not key_id or not key_secret:
        raise RuntimeError("Razorpay is not configured")
    return razorpay.Client(auth=(key_id, key_secret))


def create_premium_order(*, settings: Settings, user_id: int) -> dict[str, Any]:
    """Create a Razorpay order for premium at the active env price."""
    client = _client(settings)
    amount_inr = get_active_price(settings)
    amount_paise = amount_inr * 100
    receipt = f"p{user_id}_{uuid.uuid4().hex[:10]}"[:40]
    payload: dict[str, Any] = {
        "amount": amount_paise,
        "currency": PREMIUM_CURRENCY,
        "receipt": receipt,
        "notes": {
            "user_id": str(user_id),
            "purpose": "premium_monthly",
            "pricing_mode": settings.PRICING_MODE,
            "amount_paise": str(amount_paise),
        },
    }
    try:
        order = client.order.create(data=payload)
    except (BadRequestError, ServerError) as exc:
        logger.warning("razorpay_order_create_failed", extra={"error": str(exc)})
        raise RuntimeError("Could not create payment order") from exc
    return {
        "order_id": order["id"],
        "amount": int(order["amount"]),
        "currency": str(order["currency"]),
    }


def verify_premium_payment(
    *,
    settings: Settings,
    user_id: int,
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
) -> None:
    """
    Verify Razorpay signature and ensure the order was created for this user.
    Raises RuntimeError on failure.
    """
    client = _client(settings)
    params = {
        "razorpay_order_id": razorpay_order_id,
        "razorpay_payment_id": razorpay_payment_id,
        "razorpay_signature": razorpay_signature,
    }
    try:
        client.utility.verify_payment_signature(params)
    except SignatureVerificationError as exc:
        raise RuntimeError("Invalid payment signature") from exc

    try:
        order = client.order.fetch(razorpay_order_id)
    except (BadRequestError, ServerError) as exc:
        logger.warning("razorpay_order_fetch_failed", extra={"error": str(exc)})
        raise RuntimeError("Could not validate order") from exc

    notes = order.get("notes") or {}
    owner = notes.get("user_id")
    if owner is None or str(owner) != str(user_id):
        raise RuntimeError("Order does not belong to this account")

    paid_paise = int(order.get("amount") or 0)
    if paid_paise not in allowed_premium_amounts_paise(settings):
        raise RuntimeError("Unexpected order amount")
