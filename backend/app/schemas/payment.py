"""Payment (Razorpay) request/response schemas."""

from pydantic import BaseModel, Field


class PaymentOrderResponse(BaseModel):
    order_id: str
    amount: int = Field(..., description="Amount in smallest currency unit (paise for INR)")
    currency: str


class PaymentVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class PaymentVerifyResponse(BaseModel):
    success: bool = True


class PaymentConfigResponse(BaseModel):
    """Public pricing hint for checkout UI (no secrets)."""

    price: int = Field(..., description="Active premium price in whole rupees")
    mode: str = Field(..., description='Effective pricing mode: "test" or "prod"')
