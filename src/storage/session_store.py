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
