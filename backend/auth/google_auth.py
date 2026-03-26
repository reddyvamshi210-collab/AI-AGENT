"""Google OAuth 2.0 Authentication for Gmail and Calendar access."""
import os
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from google_auth_oauthlib.flow import Flow

google_auth_router = APIRouter()

SCOPES = [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.events",
]

# In-memory token store (use Redis/DB in production)
_token_store: dict[str, str] = {}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AuthStatus(BaseModel):
    authenticated: bool
    scopes: list[str] = []


def _get_flow() -> Flow:
    """Create a Google OAuth flow from environment variables."""
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/google/callback")

    if not client_id or not client_secret:
        raise HTTPException(
            status_code=500,
            detail="Google OAuth credentials not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
        )

    client_config = {
        "web": {
            "client_id": client_id,
            "client_secret": client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [redirect_uri],
        }
    }

    flow = Flow.from_client_config(
        client_config,
        scopes=SCOPES,
        redirect_uri=redirect_uri,
    )
    return flow


@google_auth_router.get("/google/login")
async def google_login():
    """Redirect user to Google OAuth consent screen."""
    flow = _get_flow()
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )
    return {"auth_url": auth_url}


@google_auth_router.get("/google/callback")
async def google_callback(code: str, state: Optional[str] = None):
    """Handle Google OAuth callback and exchange code for tokens."""
    flow = _get_flow()
    flow.fetch_token(code=code)

    credentials = flow.credentials
    token = credentials.token

    # Store token (in production, associate with user session)
    _token_store["default"] = token

    # Redirect to frontend dashboard with token
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    return RedirectResponse(
        url=f"{frontend_url}/dashboard?google_token={token}"
    )


@google_auth_router.get("/google/status", response_model=AuthStatus)
async def google_auth_status():
    """Check if Google account is connected."""
    token = _token_store.get("default")
    return AuthStatus(
        authenticated=token is not None,
        scopes=SCOPES if token else [],
    )


@google_auth_router.get("/google/token", response_model=TokenResponse)
async def get_google_token():
    """Get the stored Google access token."""
    token = _token_store.get("default")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated with Google")
    return TokenResponse(access_token=token)


def get_google_credentials() -> Optional[str]:
    """Utility to get stored Google token."""
    return _token_store.get("default")
