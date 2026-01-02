"""Payment API endpoints."""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from src.api.dependencies import CurrentUser
from src.schemas.payment import (
    ConfirmPaymentRequest,
    ConfirmPaymentResponse,
    PaymentFailureRequest,
    PaymentFailureResponse,
    PaymentStatusResponse,
)
from src.services.payment_service import PaymentService
from src.models.payment import PaymentStatus

logger = logging.getLogger(__name__)

router = APIRouter()

# Dependency to get payment service
_payment_service: PaymentService | None = None


def get_payment_service() -> PaymentService:
    """Get payment service instance.

    Returns:
        PaymentService instance
    """
    global _payment_service
    if _payment_service is None:
        _payment_service = PaymentService()
    return _payment_service


PaymentServiceDep = Annotated[PaymentService, Depends(get_payment_service)]


@router.post("/confirm", response_model=ConfirmPaymentResponse)
async def confirm_payment(
    request: ConfirmPaymentRequest,
    current_user: CurrentUser,
    payment_service: PaymentServiceDep,
) -> ConfirmPaymentResponse:
    """Confirm a payment after user returns from Toss.

    Args:
        request: Payment confirmation request
        current_user: Authenticated user
        payment_service: Payment service instance

    Returns:
        Payment confirmation response

    Raises:
        HTTPException: If payment confirmation fails
    """
    try:
        logger.info(f"Confirming payment for order {request.order_id}")

        response = await payment_service.confirm_payment(
            payment_key=request.payment_key,
            order_id=request.order_id,
            amount=request.amount,
        )

        return response

    except ValueError as e:
        logger.warning(f"Payment confirmation validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Payment confirmation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to confirm payment. Please try again.",
        )


@router.post("/fail", response_model=PaymentFailureResponse)
async def record_payment_failure(
    request: PaymentFailureRequest,
    current_user: CurrentUser,
    payment_service: PaymentServiceDep,
) -> PaymentFailureResponse:
    """Record a payment failure from Toss redirect.

    Args:
        request: Payment failure request
        current_user: Authenticated user
        payment_service: Payment service instance

    Returns:
        Payment failure response

    Raises:
        HTTPException: If recording failure fails
    """
    try:
        logger.info(
            f"Recording payment failure for order {request.order_id}: {request.code}"
        )

        await payment_service.record_payment_failure(
            order_id=request.order_id,
            error_code=request.code,
            error_message=request.message,
        )

        return PaymentFailureResponse(
            status=PaymentStatus.FAILED,
            order_id=request.order_id,
            error_code=request.code,
            error_message=request.message,
        )

    except ValueError as e:
        logger.warning(f"Payment failure recording error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Error recording payment failure: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record payment failure.",
        )


@router.get("/status/{order_id}", response_model=PaymentStatusResponse)
async def get_payment_status(
    order_id: str,
    current_user: CurrentUser,
    payment_service: PaymentServiceDep,
) -> PaymentStatusResponse:
    """Get payment status for an order.

    Args:
        order_id: Order identifier
        current_user: Authenticated user
        payment_service: Payment service instance

    Returns:
        Payment status response

    Raises:
        HTTPException: If status retrieval fails
    """
    try:
        logger.info(f"Getting payment status for order {order_id}")

        response = await payment_service.get_payment_status(
            order_id=order_id, user_id=current_user.id
        )

        return response

    except ValueError as e:
        logger.warning(f"Payment status retrieval error: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Error getting payment status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve payment status.",
        )
