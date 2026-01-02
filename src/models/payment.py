"""Payment models for Toss Payments integration."""

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

from src.config.settings import KST


class PaymentStatus(str, Enum):
    """Payment transaction status."""

    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    CONFIRMING = "CONFIRMING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"


class PaymentSession(BaseModel):
    """Payment session model for tracking transactions."""

    session_id: str = Field(..., description="Unique session identifier (UUID)")
    user_id: str = Field(..., description="User who initiated the payment")
    order_id: str = Field(..., description="Internal order identifier (UUID)")
    payment_key: Optional[str] = Field(None, description="Toss Payments payment key")
    amount: int = Field(..., description="Payment amount in KRW (smallest unit)")
    order_name: str = Field(..., description="Description of purchase")
    customer_data: Optional[dict] = Field(
        None, description="Custom data for post-payment actions (e.g., problemId)"
    )
    status: PaymentStatus = Field(
        default=PaymentStatus.PENDING, description="Current payment state"
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(KST), description="Payment initiation time"
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(KST), description="Last status update time"
    )
    expires_at: datetime = Field(..., description="Session expiration time")
    toss_response: Optional[dict] = Field(
        None, description="Raw Toss API response for debugging"
    )
    error_code: Optional[str] = Field(None, description="Error code if payment failed")
    error_message: Optional[str] = Field(
        None, description="User-friendly error message"
    )

    class Config:
        """Pydantic model configuration."""

        json_encoders = {datetime: lambda v: v.isoformat()}
