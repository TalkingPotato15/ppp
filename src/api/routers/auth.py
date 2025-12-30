"""Authentication API endpoints."""

from datetime import timedelta
from typing import Annotated, Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import DbSession, CurrentUser
from src.auth.jwt import create_access_token, create_refresh_token, decode_token, TokenError
from src.auth.password import hash_password, verify_password, validate_password_strength, hash_token
from src.auth.oauth import verify_google_token, OAuthError
from src.auth.email import send_password_reset_email, EmailError
from src.models.user import AuthProvider
from src.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    GoogleAuthRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    AuthResponse,
    TokenResponse,
    MessageResponse,
)
from src.schemas.user import UserResponse
from src.storage.user_store import (
    create_user,
    get_user_by_email,
    get_user_by_google_id,
    update_last_login,
    update_password,
    save_refresh_token,
    get_refresh_token,
    revoke_refresh_token,
    revoke_all_user_tokens,
)


router = APIRouter()


def set_auth_cookies(
    response: Response,
    access_token: str,
    refresh_token: str,
    remember_me: bool = False,
) -> None:
    """Set authentication cookies on response."""
    # Access token - shorter expiry, httpOnly
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=15 * 60,  # 15 minutes
    )

    # Refresh token - longer expiry, httpOnly
    max_age = 30 * 24 * 60 * 60 if remember_me else 7 * 24 * 60 * 60
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=max_age,
    )


def clear_auth_cookies(response: Response) -> None:
    """Clear authentication cookies from response."""
    response.delete_cookie(key="access_token")
    response.delete_cookie(key="refresh_token")


@router.post("/register", response_model=AuthResponse)
async def register(
    request: RegisterRequest,
    response: Response,
    session: DbSession,
):
    """Register a new user with email and password."""
    # Validate password strength
    is_valid, error_msg = validate_password_strength(request.password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg,
        )

    # Check if email already exists
    existing_user = await get_user_by_email(session, request.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    # Create user
    password_hash = hash_password(request.password)
    user = await create_user(
        session,
        email=request.email,
        password_hash=password_hash,
        nickname=request.nickname,
        auth_provider=AuthProvider.LOCAL,
    )

    # Create tokens
    access_token = create_access_token(user.id)
    refresh_token, expires_at = create_refresh_token(user.id, remember_me=False)

    # Save refresh token
    await save_refresh_token(
        session,
        user_id=user.id,
        token_hash=hash_token(refresh_token),
        expires_at=expires_at,
    )

    # Update last login
    await update_last_login(session, user.id)

    # Set cookies
    set_auth_cookies(response, access_token, refresh_token)

    return AuthResponse(
        user=UserResponse.model_validate(user),
        access_token=access_token,
    )


@router.post("/login", response_model=AuthResponse)
async def login(
    request: LoginRequest,
    response: Response,
    session: DbSession,
):
    """Login with email and password."""
    # Get user
    user = await get_user_by_email(session, request.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Check if user uses password auth
    if user.auth_provider != AuthProvider.LOCAL or not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Please use Google login for this account",
        )

    # Verify password
    if not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled",
        )

    # Create tokens
    access_token = create_access_token(user.id)
    refresh_token, expires_at = create_refresh_token(user.id, remember_me=request.remember_me)

    # Save refresh token
    await save_refresh_token(
        session,
        user_id=user.id,
        token_hash=hash_token(refresh_token),
        expires_at=expires_at,
    )

    # Update last login
    await update_last_login(session, user.id)

    # Set cookies
    set_auth_cookies(response, access_token, refresh_token, request.remember_me)

    return AuthResponse(
        user=UserResponse.model_validate(user),
        access_token=access_token,
    )


@router.post("/logout", response_model=MessageResponse)
async def logout(
    response: Response,
    session: DbSession,
    refresh_token: Annotated[Optional[str], Cookie()] = None,
):
    """Logout and revoke refresh token."""
    if refresh_token:
        await revoke_refresh_token(session, hash_token(refresh_token))

    clear_auth_cookies(response)

    return MessageResponse(message="Successfully logged out")


@router.post("/refresh", response_model=TokenResponse)
async def refresh_access_token(
    response: Response,
    session: DbSession,
    refresh_token: Annotated[Optional[str], Cookie()] = None,
):
    """Refresh access token using refresh token."""
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token required",
        )

    # Verify refresh token exists and is valid
    token_hash = hash_token(refresh_token)
    stored_token = await get_refresh_token(session, token_hash)
    if not stored_token:
        clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    # Decode and verify token
    try:
        payload = decode_token(refresh_token)
        user_id = payload.get("sub")
        token_type = payload.get("type")

        if not user_id or token_type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
            )
    except TokenError:
        clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    # Create new access token
    access_token = create_access_token(user_id)

    # Set new access token cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=15 * 60,
    )

    return TokenResponse(access_token=access_token)


@router.post("/google", response_model=AuthResponse)
async def google_auth(
    request: GoogleAuthRequest,
    response: Response,
    session: DbSession,
):
    """Login or register with Google OAuth."""
    try:
        google_info = await verify_google_token(request.id_token)
    except OAuthError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )

    # Check if user exists by Google ID
    user = await get_user_by_google_id(session, google_info.google_id)

    if not user:
        # Check if email exists with different auth
        existing_user = await get_user_by_email(session, google_info.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered with password. Please login with password.",
            )

        # Create new user
        user = await create_user(
            session,
            email=google_info.email,
            nickname=google_info.name,
            auth_provider=AuthProvider.GOOGLE,
            google_id=google_info.google_id,
        )

    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled",
        )

    # Create tokens
    access_token = create_access_token(user.id)
    refresh_token, expires_at = create_refresh_token(user.id, remember_me=True)

    # Save refresh token
    await save_refresh_token(
        session,
        user_id=user.id,
        token_hash=hash_token(refresh_token),
        expires_at=expires_at,
    )

    # Update last login
    await update_last_login(session, user.id)

    # Set cookies
    set_auth_cookies(response, access_token, refresh_token, remember_me=True)

    return AuthResponse(
        user=UserResponse.model_validate(user),
        access_token=access_token,
    )


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(
    request: ForgotPasswordRequest,
    session: DbSession,
):
    """Send password reset email."""
    # Always return success to prevent email enumeration
    user = await get_user_by_email(session, request.email)

    if user and user.auth_provider == AuthProvider.LOCAL:
        # Create reset token (short-lived access token)
        reset_token = create_access_token(
            user.id,
            expires_delta=timedelta(hours=1),
        )

        try:
            await send_password_reset_email(request.email, reset_token)
        except EmailError:
            # Log error but don't expose to user
            pass

    return MessageResponse(
        message="If an account exists with this email, a password reset link has been sent."
    )


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    request: ResetPasswordRequest,
    session: DbSession,
):
    """Reset password using token."""
    # Validate new password
    is_valid, error_msg = validate_password_strength(request.new_password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg,
        )

    # Verify token
    try:
        payload = decode_token(request.token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid reset token",
            )
    except TokenError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    # Update password
    password_hash = hash_password(request.new_password)
    success = await update_password(session, user_id, password_hash)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not found",
        )

    # Revoke all refresh tokens
    await revoke_all_user_tokens(session, user_id)

    return MessageResponse(message="Password has been reset successfully")
