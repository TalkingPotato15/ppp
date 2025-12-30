"""User storage operations for authentication."""

from datetime import datetime
from typing import Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import AuthProvider, User
from src.models.refresh_token import RefreshToken


# ============================================================================
# User Operations
# ============================================================================


async def create_user(
    session: AsyncSession,
    email: str,
    password_hash: Optional[str] = None,
    nickname: Optional[str] = None,
    auth_provider: AuthProvider = AuthProvider.LOCAL,
    google_id: Optional[str] = None,
) -> User:
    """Create a new user.

    Args:
        session: Database session.
        email: User email address.
        password_hash: Hashed password (optional for OAuth users).
        nickname: User display name.
        auth_provider: Authentication provider (LOCAL or GOOGLE).
        google_id: Google account ID (for OAuth users).

    Returns:
        The created User object.
    """
    user = User(
        email=email,
        password_hash=password_hash,
        nickname=nickname,
        auth_provider=auth_provider,
        google_id=google_id,
    )
    session.add(user)
    await session.flush()
    return user


async def get_user_by_email(
    session: AsyncSession, email: str
) -> Optional[User]:
    """Get a user by email address.

    Args:
        session: Database session.
        email: User email address.

    Returns:
        User object if found, None otherwise.
    """
    result = await session.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_user_by_id(session: AsyncSession, user_id: str) -> Optional[User]:
    """Get a user by ID.

    Args:
        session: Database session.
        user_id: User UUID.

    Returns:
        User object if found, None otherwise.
    """
    result = await session.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def get_user_by_google_id(
    session: AsyncSession, google_id: str
) -> Optional[User]:
    """Get a user by Google ID.

    Args:
        session: Database session.
        google_id: Google account ID.

    Returns:
        User object if found, None otherwise.
    """
    result = await session.execute(select(User).where(User.google_id == google_id))
    return result.scalar_one_or_none()


async def update_user(
    session: AsyncSession,
    user_id: str,
    nickname: Optional[str] = None,
) -> Optional[User]:
    """Update user profile.

    Args:
        session: Database session.
        user_id: User UUID.
        nickname: New nickname (if provided).

    Returns:
        Updated User object if found, None otherwise.
    """
    user = await get_user_by_id(session, user_id)
    if not user:
        return None

    if nickname is not None:
        user.nickname = nickname

    await session.flush()
    return user


async def update_last_login(session: AsyncSession, user_id: str) -> None:
    """Update user's last login timestamp.

    Args:
        session: Database session.
        user_id: User UUID.
    """
    await session.execute(
        update(User)
        .where(User.id == user_id)
        .values(last_login_at=datetime.utcnow())
    )


async def update_password(
    session: AsyncSession, user_id: str, password_hash: str
) -> bool:
    """Update user's password.

    Args:
        session: Database session.
        user_id: User UUID.
        password_hash: New hashed password.

    Returns:
        True if user was found and updated, False otherwise.
    """
    result = await session.execute(
        update(User)
        .where(User.id == user_id)
        .values(password_hash=password_hash)
    )
    return result.rowcount > 0


# ============================================================================
# Refresh Token Operations
# ============================================================================


async def save_refresh_token(
    session: AsyncSession,
    user_id: str,
    token_hash: str,
    expires_at: datetime,
    device_info: Optional[str] = None,
) -> RefreshToken:
    """Save a new refresh token.

    Args:
        session: Database session.
        user_id: User UUID.
        token_hash: Hashed refresh token.
        expires_at: Token expiration datetime.
        device_info: User agent or device information.

    Returns:
        The created RefreshToken object.
    """
    token = RefreshToken(
        user_id=user_id,
        token_hash=token_hash,
        expires_at=expires_at,
        device_info=device_info,
    )
    session.add(token)
    await session.flush()
    return token


async def get_refresh_token(
    session: AsyncSession, token_hash: str
) -> Optional[RefreshToken]:
    """Get a refresh token by hash.

    Args:
        session: Database session.
        token_hash: Hashed refresh token.

    Returns:
        RefreshToken object if found and valid, None otherwise.
    """
    result = await session.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.is_revoked == False,  # noqa: E712
            RefreshToken.expires_at > datetime.utcnow(),
        )
    )
    return result.scalar_one_or_none()


async def revoke_refresh_token(session: AsyncSession, token_hash: str) -> bool:
    """Revoke a refresh token.

    Args:
        session: Database session.
        token_hash: Hashed refresh token.

    Returns:
        True if token was found and revoked, False otherwise.
    """
    result = await session.execute(
        update(RefreshToken)
        .where(RefreshToken.token_hash == token_hash)
        .values(is_revoked=True)
    )
    return result.rowcount > 0


async def revoke_all_user_tokens(session: AsyncSession, user_id: str) -> int:
    """Revoke all refresh tokens for a user.

    Args:
        session: Database session.
        user_id: User UUID.

    Returns:
        Number of tokens revoked.
    """
    result = await session.execute(
        update(RefreshToken)
        .where(
            RefreshToken.user_id == user_id,
            RefreshToken.is_revoked == False,  # noqa: E712
        )
        .values(is_revoked=True)
    )
    return result.rowcount


async def cleanup_expired_tokens(session: AsyncSession) -> int:
    """Delete expired refresh tokens.

    Args:
        session: Database session.

    Returns:
        Number of tokens deleted.
    """
    from sqlalchemy import delete

    result = await session.execute(
        delete(RefreshToken).where(RefreshToken.expires_at < datetime.utcnow())
    )
    return result.rowcount
