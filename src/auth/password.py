"""Password hashing and validation."""

import re
import hashlib

import bcrypt


def hash_password(password: str) -> str:
    """Hash a password using bcrypt.

    Args:
        password: Plain text password.

    Returns:
        Hashed password.
    """
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash.

    Args:
        plain_password: Plain text password to verify.
        hashed_password: Hashed password to compare against.

    Returns:
        True if password matches, False otherwise.
    """
    try:
        password_bytes = plain_password.encode('utf-8')
        hashed_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception:
        return False


def validate_password_strength(password: str) -> tuple[bool, str]:
    """Validate password meets strength requirements.

    Requirements:
    - Minimum 8 characters
    - Must contain at least one letter
    - Must contain at least one number

    Args:
        password: Password to validate.

    Returns:
        Tuple of (is_valid, error_message).
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"

    if not re.search(r"[a-zA-Z]", password):
        return False, "Password must contain at least one letter"

    if not re.search(r"\d", password):
        return False, "Password must contain at least one number"

    return True, ""


def hash_token(token: str) -> str:
    """Hash a token for storage.

    Uses SHA-256 for fast, deterministic hashing of tokens.
    This is used for refresh tokens where we need to look up by hash.

    Args:
        token: Token string to hash.

    Returns:
        SHA-256 hash of the token.
    """
    return hashlib.sha256(token.encode()).hexdigest()
