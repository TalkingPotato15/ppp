"""Google OAuth token verification."""

from dataclasses import dataclass
from typing import Optional

import httpx

from src.config.settings import settings


class OAuthError(Exception):
    """Exception raised for OAuth-related errors."""

    pass


@dataclass
class GoogleUserInfo:
    """User information from Google OAuth."""

    google_id: str
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None


async def verify_google_token(id_token: str) -> GoogleUserInfo:
    """Verify a Google ID token and extract user information.

    Args:
        id_token: Google ID token from frontend.

    Returns:
        GoogleUserInfo with user details.

    Raises:
        OAuthError: If token verification fails.
    """
    if not settings.google_client_id:
        raise OAuthError("Google OAuth is not configured")

    # Verify token with Google's tokeninfo endpoint
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": id_token},
        )

        if response.status_code != 200:
            raise OAuthError("Invalid Google token")

        data = response.json()

    # Verify the token was issued for our app
    if data.get("aud") != settings.google_client_id:
        raise OAuthError("Token was not issued for this application")

    # Verify email is verified
    if data.get("email_verified") != "true":
        raise OAuthError("Email not verified with Google")

    # Extract user info
    google_id = data.get("sub")
    email = data.get("email")

    if not google_id or not email:
        raise OAuthError("Missing required user information from Google")

    return GoogleUserInfo(
        google_id=google_id,
        email=email,
        name=data.get("name"),
        picture=data.get("picture"),
    )
