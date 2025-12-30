"""Payment service for Toss Payments integration."""

import base64
import logging
from datetime import datetime, timedelta
from typing import Dict, Optional
from uuid import uuid4

import httpx

from src.config.settings import KST, settings
from src.models.payment import PaymentSession, PaymentStatus
from src.schemas.payment import (
    ConfirmPaymentResponse,
    PaymentStatusResponse,
)
from src.storage.session_store import (
    get_payment_session,
    get_payment_session_by_order_id,
    save_payment_session,
)

logger = logging.getLogger(__name__)


class PaymentService:
    """Service for handling Toss Payments operations."""

    def __init__(self):
        """Initialize Toss Payments client."""
        self.api_base_url = settings.toss_api_base_url
        self.secret_key = settings.toss_payments_secret_key

        # Create auth header (Toss uses Basic auth with secret key)
        auth_string = f"{self.secret_key}:"
        auth_bytes = auth_string.encode("utf-8")
        auth_b64 = base64.b64encode(auth_bytes).decode("utf-8")

        self.headers = {
            "Authorization": f"Basic {auth_b64}",
            "Content-Type": "application/json",
        }

        # Initialize async HTTP client
        self.client = httpx.AsyncClient(
            base_url=self.api_base_url,
            headers=self.headers,
            timeout=30.0,
        )

        logger.info("PaymentService initialized with Toss API")

    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()

    def _is_session_expired(self, session: PaymentSession) -> bool:
        """Check if a payment session is expired.

        Args:
            session: Payment session to check

        Returns:
            True if expired, False otherwise
        """
        return datetime.now(KST) > session.expires_at

    async def confirm_payment(
        self, payment_key: str, order_id: str, amount: int
    ) -> ConfirmPaymentResponse:
        """Confirm a payment after user returns from Toss.

        Args:
            payment_key: Payment key from Toss redirect
            order_id: Order ID from Toss redirect
            amount: Payment amount from Toss redirect

        Returns:
            ConfirmPaymentResponse with payment details

        Raises:
            ValueError: If validation fails
            httpx.HTTPError: If Toss API call fails
        """
        # Try to retrieve existing session (may not exist for SDK-based payments)
        session = get_payment_session_by_order_id(order_id)

        # If session exists, validate it
        if session:
            # Check if session expired
            if self._is_session_expired(session):
                session.status = PaymentStatus.EXPIRED
                save_payment_session(session)
                raise ValueError("Payment session has expired")

            # Update status to confirming
            session.status = PaymentStatus.CONFIRMING
            session.updated_at = datetime.now(KST)
            save_payment_session(session)

        # Call Toss API to confirm payment
        payload = {"orderId": order_id, "amount": amount}

        logger.info(f"Confirming payment with Toss: {payment_key}")

        try:
            response = await self.client.post(
                f"/v1/payments/{payment_key}/confirm", json=payload
            )
            response.raise_for_status()
            toss_data = response.json()

            # Update or create session
            if session:
                session.status = PaymentStatus.SUCCESS
                session.payment_key = payment_key
                session.toss_response = toss_data
                session.updated_at = datetime.now(KST)
                save_payment_session(session)
            else:
                # Create new session for SDK-based payment
                logger.info(f"Creating new session for SDK payment: {order_id}")
                session_id = str(uuid4())
                created_at = datetime.now(KST)
                session = PaymentSession(
                    session_id=session_id,
                    user_id="sdk_payment",  # Placeholder for SDK payments
                    order_id=order_id,
                    payment_key=payment_key,
                    amount=amount,
                    order_name=toss_data.get("orderName", "Payment"),
                    status=PaymentStatus.SUCCESS,
                    created_at=created_at,
                    updated_at=created_at,
                    expires_at=created_at + timedelta(minutes=30),
                    toss_response=toss_data,
                )
                save_payment_session(session)

            logger.info(f"Payment confirmed successfully: {order_id}")

            # Extract approval time
            approved_at = None
            if "approvedAt" in toss_data:
                approved_at = datetime.fromisoformat(
                    toss_data["approvedAt"].replace("+09:00", "")
                ).replace(tzinfo=KST)

            return ConfirmPaymentResponse(
                status=PaymentStatus.SUCCESS,
                order_id=order_id,
                payment_key=payment_key,
                amount=amount,
                approved_at=approved_at,
                method=toss_data.get("method"),
            )

        except httpx.HTTPError as e:
            logger.error(f"Toss API error during payment confirmation: {e}")
            if session:
                session.status = PaymentStatus.FAILED
                session.error_code = "CONFIRMATION_FAILED"
                session.error_message = "Failed to confirm payment with Toss"
                save_payment_session(session)
            raise

    async def get_payment_status(self, order_id: str, user_id: str) -> PaymentStatusResponse:
        """Get payment status for an order.

        Args:
            order_id: Order identifier
            user_id: User identifier (for authorization)

        Returns:
            PaymentStatusResponse with current status

        Raises:
            ValueError: If session not found or unauthorized
        """
        session = get_payment_session_by_order_id(order_id)
        if not session:
            raise ValueError(f"Payment session not found for order {order_id}")

        # Verify user authorization
        if session.user_id != user_id:
            raise ValueError("Unauthorized to view this payment")

        # Check if expired
        if self._is_session_expired(session) and session.status not in [
            PaymentStatus.SUCCESS,
            PaymentStatus.FAILED,
        ]:
            session.status = PaymentStatus.EXPIRED
            save_payment_session(session)

        # Extract approval time if available
        approved_at = None
        if session.toss_response and "approvedAt" in session.toss_response:
            approved_at = datetime.fromisoformat(
                session.toss_response["approvedAt"].replace("+09:00", "")
            ).replace(tzinfo=KST)

        return PaymentStatusResponse(
            order_id=order_id,
            status=session.status,
            amount=session.amount,
            order_name=session.order_name,
            customer_data=session.customer_data,
            created_at=session.created_at,
            approved_at=approved_at,
            error_message=session.error_message,
        )

    async def record_payment_failure(
        self, order_id: str, error_code: str, error_message: str
    ) -> None:
        """Record a payment failure from Toss redirect.

        Args:
            order_id: Order identifier
            error_code: Error code from Toss
            error_message: Error message from Toss

        Raises:
            ValueError: If session not found
        """
        session = get_payment_session_by_order_id(order_id)
        if not session:
            raise ValueError(f"Payment session not found for order {order_id}")

        # Update session with failure details
        session.status = PaymentStatus.FAILED
        session.error_code = error_code
        session.error_message = error_message
        session.updated_at = datetime.now(KST)
        save_payment_session(session)

        logger.info(f"Payment failure recorded for order {order_id}: {error_code}")
