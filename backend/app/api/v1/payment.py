"""Razorpay payment routes (premium upgrade)."""

from fastapi import APIRouter, Request

from app.config import get_settings
from app.dependencies.auth import CurrentUser
from app.dependencies.database import DbSession
from app.exceptions.app_exceptions import AppException
from app.schemas.payment import (
    PaymentConfigResponse,
    PaymentOrderResponse,
    PaymentVerifyRequest,
    PaymentVerifyResponse,
)
from app.services import payment as payment_service
from app.services import payment_webhook as payment_webhook_service
from razorpay.errors import SignatureVerificationError

router = APIRouter()


def _require_razorpay() -> None:
    s = get_settings()
    if not (s.RAZORPAY_KEY_ID or "").strip() or not (s.RAZORPAY_KEY_SECRET or "").strip():
        raise AppException(
            "Payments are not configured.",
            status_code=503,
            error_code="PAYMENTS_DISABLED",
        )


def _require_webhook_secret() -> str:
    s = get_settings()
    secret = (s.RAZORPAY_WEBHOOK_SECRET or "").strip()
    if not secret:
        raise AppException(
            "Webhook is not configured.",
            status_code=503,
            error_code="WEBHOOK_DISABLED",
        )
    return secret


@router.post("/webhook")
async def payment_webhook(request: Request, db: DbSession):
    """
    Razorpay server-to-server webhook. Uses raw body + ``X-Razorpay-Signature``;
    does not parse JSON before verification.
    """
    secret = _require_webhook_secret()
    body_bytes = await request.body()
    signature = request.headers.get("X-Razorpay-Signature")
    try:
        payment_webhook_service.verify_webhook_signature_or_raise(
            raw_body=body_bytes,
            signature_header=signature,
            webhook_secret=secret,
        )
    except SignatureVerificationError as exc:
        raise AppException(
            "Invalid webhook signature.",
            status_code=400,
            error_code="WEBHOOK_SIGNATURE_INVALID",
        ) from exc

    try:
        payload = payment_webhook_service.parse_webhook_json(body_bytes)
    except ValueError as exc:
        raise AppException(
            "Invalid webhook payload.",
            status_code=400,
            error_code="WEBHOOK_BAD_PAYLOAD",
        ) from exc

    outcome = await payment_webhook_service.apply_payment_captured_webhook(
        db,
        get_settings(),
        payload,
    )
    return {"status": "ok", "outcome": outcome}


@router.get("/config", response_model=PaymentConfigResponse)
async def payment_config() -> PaymentConfigResponse:
    """Active premium price and pricing mode for UI (no authentication required)."""
    s = get_settings()
    return PaymentConfigResponse(
        price=payment_service.get_active_price(s),
        mode=s.PRICING_MODE,
    )


@router.post("/create-order", response_model=PaymentOrderResponse)
async def create_order(_db: DbSession, current_user: CurrentUser) -> PaymentOrderResponse:
    """Create a Razorpay order for premium at the configured price."""
    _require_razorpay()
    if current_user.is_premium:
        raise AppException(
            "Premium is already active.",
            status_code=400,
            error_code="ALREADY_PREMIUM",
        )
    try:
        raw = payment_service.create_premium_order(
            settings=get_settings(),
            user_id=current_user.id,
        )
    except RuntimeError as exc:
        raise AppException(
            str(exc),
            status_code=502,
            error_code="PAYMENT_ORDER_FAILED",
        ) from exc
    return PaymentOrderResponse(
        order_id=raw["order_id"],
        amount=raw["amount"],
        currency=raw["currency"],
    )


@router.post("/verify", response_model=PaymentVerifyResponse)
async def verify_payment(
    body: PaymentVerifyRequest,
    db: DbSession,
    current_user: CurrentUser,
) -> PaymentVerifyResponse:
    """Verify Razorpay payment and grant premium."""
    _require_razorpay()
    if current_user.is_premium:
        return PaymentVerifyResponse(success=True)
    try:
        payment_service.verify_premium_payment(
            settings=get_settings(),
            user_id=current_user.id,
            razorpay_order_id=body.razorpay_order_id,
            razorpay_payment_id=body.razorpay_payment_id,
            razorpay_signature=body.razorpay_signature,
        )
    except RuntimeError as exc:
        raise AppException(
            str(exc),
            status_code=400,
            error_code="PAYMENT_VERIFY_FAILED",
        ) from exc

    current_user.is_premium = True
    await db.flush()
    await db.refresh(current_user)
    return PaymentVerifyResponse(success=True)
