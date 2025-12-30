"""JWT token creation and validation."""

from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt

from src.config.settings import settings


class TokenError(Exception):
    """Exception raised for token-related errors."""

    pass


def create_access_token(
    user_id: str,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Create a new access token.

    Args:
        user_id: User UUID to encode in the token.
        expires_delta: Optional custom expiration time.

    Returns:
        Encoded JWT access token.
    """
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.access_token_expire_minutes)

    expire = datetime.utcnow() + expires_delta
    to_encode = {
        "sub": user_id,
        "exp": expire,
        "type": "access",
    }
    return jwt.encode(
        to_encode,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )


def create_refresh_token(
    user_id: str,
    remember_me: bool = False,
) -> tuple[str, datetime]:
    """Create a new refresh token.

    Args:
        user_id: User UUID to encode in the token.
        remember_me: Whether to use extended expiration.

    Returns:
        Tuple of (encoded JWT refresh token, expiration datetime).
    """
    if remember_me:
        expires_delta = timedelta(days=settings.refresh_token_expire_days_remember)
    else:
        expires_delta = timedelta(days=settings.refresh_token_expire_days)

    expire = datetime.utcnow() + expires_delta
    to_encode = {
        "sub": user_id,
        "exp": expire,
        "type": "refresh",
    }
    token = jwt.encode(
        to_encode,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )
    return token, expire


def decode_token(token: str) -> dict:
    """Decode and validate a JWT token.

    Args:
        token: JWT token string.

    Returns:
        Decoded token payload.

    Raises:
        TokenError: If token is invalid or expired.
    """
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        return payload
    except JWTError as e:
        raise TokenError(f"Invalid token: {e}") from e


def get_user_id_from_token(token: str) -> str:
    """Extract user ID from a token.

    Args:
        token: JWT token string.

    Returns:
        User UUID from the token.

    Raises:
        TokenError: If token is invalid or doesn't contain user ID.
    """
    payload = decode_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise TokenError("Token does not contain user ID")
    return user_id


def verify_token_type(token: str, expected_type: str) -> bool:
    """Verify that a token is of the expected type.

    Args:
        token: JWT token string.
        expected_type: Expected token type ("access" or "refresh").

    Returns:
        True if token type matches, False otherwise.
    """
    try:
        payload = decode_token(token)
        return payload.get("type") == expected_type
    except TokenError:
        return False
