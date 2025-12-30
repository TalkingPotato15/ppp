"""User profile API endpoints."""

from fastapi import APIRouter

from src.api.dependencies import DbSession, CurrentUser
from src.schemas.user import UserResponse, UserUpdateRequest
from src.storage.user_store import update_user


router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: CurrentUser,
):
    """Get current user's profile."""
    return UserResponse.model_validate(current_user)


@router.patch("/me", response_model=UserResponse)
async def update_current_user_profile(
    request: UserUpdateRequest,
    current_user: CurrentUser,
    session: DbSession,
):
    """Update current user's profile."""
    updated_user = await update_user(
        session,
        user_id=current_user.id,
        nickname=request.nickname,
    )

    return UserResponse.model_validate(updated_user)
