"""In-memory session storage for payment sessions."""

import logging
from datetime import datetime
from typing import Dict, Optional

from src.config.settings import KST
from src.models.payment import PaymentSession

logger = logging.getLogger(__name__)

# In-memory storage for POC
# Key: session_id, Value: PaymentSession
_payment_sessions: Dict[str, PaymentSession] = {}


def save_payment_session(session: PaymentSession) -> None:
    """Save or update a payment session.

    Args:
        session: Payment session to save
    """
    _payment_sessions[session.session_id] = session
    logger.info(f"Saved payment session: {session.session_id}")


def get_payment_session(session_id: str) -> Optional[PaymentSession]:
    """Retrieve a payment session by ID.

    Args:
        session_id: Session identifier

    Returns:
        Payment session if found, None otherwise
    """
    session = _payment_sessions.get(session_id)
    if session:
        logger.debug(f"Retrieved payment session: {session_id}")
    else:
        logger.warning(f"Payment session not found: {session_id}")
    return session


def get_payment_session_by_order_id(order_id: str) -> Optional[PaymentSession]:
    """Retrieve a payment session by order ID.

    Args:
        order_id: Order identifier

    Returns:
        Payment session if found, None otherwise
    """
    for session in _payment_sessions.values():
        if session.order_id == order_id:
            logger.debug(f"Retrieved payment session by order_id: {order_id}")
            return session
    logger.warning(f"Payment session not found for order_id: {order_id}")
    return None


def delete_payment_session(session_id: str) -> bool:
    """Delete a payment session.

    Args:
        session_id: Session identifier

    Returns:
        True if session was deleted, False if not found
    """
    if session_id in _payment_sessions:
        del _payment_sessions[session_id]
        logger.info(f"Deleted payment session: {session_id}")
        return True
    logger.warning(f"Cannot delete, payment session not found: {session_id}")
    return False


def cleanup_expired_sessions() -> int:
    """Remove expired payment sessions.

    Returns:
        Number of sessions cleaned up
    """
    now = datetime.now(KST)
    expired_ids = [
        sid for sid, session in _payment_sessions.items() if session.expires_at < now
    ]

    for sid in expired_ids:
        del _payment_sessions[sid]

    if expired_ids:
        logger.info(f"Cleaned up {len(expired_ids)} expired payment sessions")
    return len(expired_ids)


def get_unused_payment(user_id: str, problem_id: str) -> Optional[PaymentSession]:
    """Get an unused successful payment for a user and problem.

    Args:
        user_id: User identifier
        problem_id: Problem identifier

    Returns:
        Unused payment session if found, None otherwise
    """
    from src.models.payment import PaymentStatus

    for session in _payment_sessions.values():
        if (
            session.user_id == user_id
            and session.problem_id == problem_id
            and session.status == PaymentStatus.SUCCESS
            and not session.is_used
        ):
            logger.debug(
                f"Found unused payment for user {user_id}, problem {problem_id}"
            )
            return session

    logger.debug(f"No unused payment found for user {user_id}, problem {problem_id}")
    return None


def mark_payment_used(payment_id: str) -> bool:
    """Mark a payment as used for idea generation.

    Args:
        payment_id: Payment session identifier

    Returns:
        True if payment was marked as used, False if not found or already used
    """
    session = _payment_sessions.get(payment_id)
    if session and not session.is_used:
        session.is_used = True
        session.used_at = datetime.now(KST)
        session.updated_at = datetime.now(KST)
        _payment_sessions[payment_id] = session
        logger.info(f"Marked payment as used: {payment_id}")
        return True

    if session and session.is_used:
        logger.warning(f"Payment already used: {payment_id}")
    else:
        logger.warning(f"Payment not found: {payment_id}")
    return False


def get_payment_sessions_for_user(
    user_id: str, problem_id: Optional[str] = None
) -> list[PaymentSession]:
    """Get all payment sessions for a user, optionally filtered by problem.

    Args:
        user_id: User identifier
        problem_id: Optional problem identifier to filter by

    Returns:
        List of payment sessions
    """
    sessions = []
    for session in _payment_sessions.values():
        if session.user_id == user_id:
            if problem_id is None or session.problem_id == problem_id:
                sessions.append(session)

    return sorted(sessions, key=lambda s: s.created_at, reverse=True)
