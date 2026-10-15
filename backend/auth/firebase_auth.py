import json
import os
import re
from pathlib import Path
from typing import Any, Dict, Optional

import firebase_admin
from firebase_admin import auth as admin_auth, credentials as admin_credentials
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from backend.db.database import get_or_create_user

security = HTTPBearer(auto_error=False)
http_request = google_requests.Request()

# Determine Firebase Project ID from env or .env.local
def _resolve_project_id() -> str:
    env_proj = os.environ.get("FIREBASE_PROJECT_ID") or os.environ.get("VITE_FIREBASE_PROJECT_ID")
    if env_proj:
        return env_proj.strip().strip('"\'')

    # Read from .env.local if present
    env_local = Path(__file__).resolve().parent.parent.parent / ".env.local"
    if env_local.exists():
        content = env_local.read_text(encoding="utf-8")
        match = re.search(r"VITE_FIREBASE_PROJECT_ID\s*=\s*[\"']?([a-zA-Z0-9_\-]+)[\"']?", content)
        if match:
            return match.group(1).strip()

    return "paperpilot-5ea10"

FIREBASE_PROJECT_ID = _resolve_project_id()

# Determine Service Account Credentials
def _init_firebase_admin() -> bool:
    """Initializes Firebase Admin SDK if service account credentials are provided."""
    if len(firebase_admin._apps) > 0:
        return True

    # 1. Check GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_PATH
    sa_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS") or os.environ.get("FIREBASE_SERVICE_ACCOUNT_PATH")
    if not sa_path:
        default_sa = Path(__file__).resolve().parent.parent / "firebase-service-account.json"
        if default_sa.exists():
            sa_path = str(default_sa)

    if sa_path and Path(sa_path).exists():
        try:
            cred = admin_credentials.Certificate(sa_path)
            firebase_admin.initialize_app(cred, options={"projectId": FIREBASE_PROJECT_ID})
            print(f"Firebase Admin SDK initialized with service account file: {sa_path}")
            return True
        except Exception as e:
            print(f"Failed to initialize Firebase Admin with service account file: {e}")

    # 2. Check FIREBASE_SERVICE_ACCOUNT_KEY (raw JSON string in env)
    sa_key_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_KEY")
    if sa_key_json:
        try:
            cert_dict = json.loads(sa_key_json)
            cred = admin_credentials.Certificate(cert_dict)
            firebase_admin.initialize_app(cred, options={"projectId": FIREBASE_PROJECT_ID})
            print("Firebase Admin SDK initialized with FIREBASE_SERVICE_ACCOUNT_KEY JSON.")
            return True
        except Exception as e:
            print(f"Failed to initialize Firebase Admin with JSON key: {e}")

    # 3. Fallback: Initialize with project ID
    try:
        firebase_admin.initialize_app(options={"projectId": FIREBASE_PROJECT_ID})
        print(f"Firebase Admin SDK initialized with projectId={FIREBASE_PROJECT_ID}")
        return True
    except Exception as e:
        print(f"Firebase Admin app init note: {e}")
        return False

_ADMIN_INITIALIZED = _init_firebase_admin()


def verify_firebase_id_token(token: str) -> Dict[str, Any]:
    """
    Verifies a Firebase ID token.
    Uses Firebase Admin SDK if fully provisioned with credentials,
    and validates cryptographic signatures against Google's public x509 certs.
    """
    if not token or not token.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is empty",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Strategy 1: Firebase Admin SDK verify_id_token
    try:
        if len(firebase_admin._apps) > 0:
            decoded = admin_auth.verify_id_token(token, check_revoked=False)
            return decoded
    except Exception as admin_err:
        # If admin SDK failed due to missing Google credentials, fall back to Google public cert verification
        pass

    # Strategy 2: Google OAuth2 verify_firebase_token using Google's public certs
    try:
        decoded = google_id_token.verify_firebase_token(
            token,
            http_request,
            audience=FIREBASE_PROJECT_ID
        )
        return decoded
    except Exception as oauth_err:
        print(f"Token verification error: {oauth_err}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired Firebase ID token: {str(oauth_err)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    auth_header: Optional[HTTPAuthorizationCredentials] = Security(security)
) -> Dict[str, Any]:
    """
    FastAPI dependency that enforces authentication.
    Reads Authorization: Bearer <token>, cryptographically verifies the Firebase ID token,
    finds or creates the user in SQLite, and returns the application user object.
    """
    if not auth_header or not auth_header.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided. Expected 'Authorization: Bearer <Firebase ID token>'",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = auth_header.credentials
    decoded = verify_firebase_id_token(token)

    firebase_uid = decoded.get("uid") or decoded.get("sub") or decoded.get("user_id")
    if not firebase_uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token: missing UID",
            headers={"WWW-Authenticate": "Bearer"},
        )

    email = decoded.get("email") or ""
    name = decoded.get("name") or (email.split("@")[0].title() if email else "Researcher")
    picture = decoded.get("picture") or ""

    # Synchronize user with local SQLite database
    user = get_or_create_user(
        firebase_uid=firebase_uid,
        name=name,
        email=email,
        profile_picture=picture
    )

    return user


async def get_optional_current_user(
    auth_header: Optional[HTTPAuthorizationCredentials] = Security(security)
) -> Optional[Dict[str, Any]]:
    """
    Optional authentication dependency for endpoints that support both
    authenticated user-specific views and unauthenticated demo views.
    """
    if not auth_header or not auth_header.credentials:
        return None

    try:
        return await get_current_user(auth_header)
    except HTTPException:
        return None
