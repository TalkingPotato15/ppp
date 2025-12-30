"""Payment request and response schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from src.models.payment import PaymentStatus


class ConfirmPaymentRequest(BaseModel):
    """Request to confirm a payment after user returns from Toss."""

    payment_key: str = Field(..., description="Payment key from Toss redirect")
    order_id: str = Field(..., description="Order ID from Toss redirect")
    amount: int = Field(..., description="Payment amount from Toss redirect")


class ConfirmPaymentResponse(BaseModel):
    """Response from payment confirmation."""

    status: PaymentStatus = Field(..., description="Payment status")
    order_id: str = Field(..., description="Internal order ID")
    payment_key: str = Field(..., description="Toss payment key")
    amount: int = Field(..., description="Payment amount")
    approved_at: Optional[datetime] = Field(None, description="Payment approval time")
    method: Optional[str] = Field(None, description="Payment method used")


class PaymentFailureRequest(BaseModel):
    """Request to record a payment failure."""

    order_id: str = Field(..., description="Order ID from Toss redirect")
    code: str = Field(..., description="Error code from Toss")
    message: str = Field(..., description="Error message from Toss")


class PaymentFailureResponse(BaseModel):
    """Response from recording payment failure."""

    status: PaymentStatus = Field(..., description="Payment status (FAILED)")
    order_id: str = Field(..., description="Internal order ID")
    error_code: str = Field(..., description="Error code")
    error_message: str = Field(..., description="User-friendly error message")


class PaymentStatusResponse(BaseModel):
    """Response for payment status query."""

    order_id: str = Field(..., description="Internal order ID")
    status: PaymentStatus = Field(..., description="Current payment status")
    amount: int = Field(..., description="Payment amount")
    order_name: str = Field(..., description="Purchase description")
    customer_data: Optional[dict] = Field(None, description="Custom data for post-payment actions")
    created_at: datetime = Field(..., description="Payment initiation time")
    approved_at: Optional[datetime] = Field(None, description="Payment approval time")
    error_message: Optional[str] = Field(None, description="Error message if failed")
