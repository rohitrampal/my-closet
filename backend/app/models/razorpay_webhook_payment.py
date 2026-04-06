"""Idempotency ledger for Razorpay ``payment.captured`` webhooks."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class RazorpayWebhookPayment(Base):
    """One row per processed ``pay_*`` id so webhooks are never applied twice."""

    __tablename__ = "razorpay_webhook_payments"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    razorpay_payment_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    razorpay_order_id: Mapped[str] = mapped_column(String(64), nullable=False)
    amount_paise: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
