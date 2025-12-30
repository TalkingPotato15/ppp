"""FastAPI dependencies for dependency injection."""

from typing import Annotated, Optional

from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.storage import async_session_factory
from src.storage.user_store import get_user_by_id
from src.models.user import User
from src.auth.jwt import decode_token, TokenError
from src.auth.password import hash_token


async def get_db() -> AsyncSession:
    """Get database session dependency.

    Yields:
        AsyncSession: Database session.
    """
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def get_current_user(
    session: Annotated[AsyncSession, Depends(get_db)],
    access_token: Annotated[Optional[str], Cookie()] = None,
) -> User:
    """Get current authenticated user.

    Args:
        session: Database session.
        access_token: JWT access token from cookie.

    Returns:
        Authenticated User object.

    Raises:
        HTTPException: If not authenticated or token is invalid.
    """
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_token(access_token)
        user_id = payload.get("sub")
        token_type = payload.get("type")

        if not user_id or token_type != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
            )

        user = await get_user_by_id(session, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is disabled",
            )

        return user

    except TokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


async def get_current_user_optional(
    session: Annotated[AsyncSession, Depends(get_db)],
    access_token: Annotated[Optional[str], Cookie()] = None,
) -> Optional[User]:
    """Get current user if authenticated, None otherwise.

    Args:
        session: Database session.
        access_token: JWT access token from cookie.

    Returns:
        User object if authenticated, None otherwise.
    """
    if not access_token:
        return None

    try:
        payload = decode_token(access_token)
        user_id = payload.get("sub")
        token_type = payload.get("type")

        if not user_id or token_type != "access":
            return None

        user = await get_user_by_id(session, user_id)
        if not user or not user.is_active:
            return None

        return user

    except TokenError:
        return None


# Type aliases for cleaner dependency injection
DbSession = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]
OptionalUser = Annotated[Optional[User], Depends(get_current_user_optional)]
