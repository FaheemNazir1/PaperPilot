from typing import Any, Dict
from fastapi import APIRouter, Depends
from backend.auth.firebase_auth import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=Dict[str, Any])
def get_authenticated_user(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Returns the verified application user profile from the SQLite database.
    Authenticated via Bearer Firebase ID token.
    """
    return {
        "id": current_user["id"],
        "firebase_uid": current_user["firebase_uid"],
        "name": current_user["name"],
        "email": current_user["email"],
        "profile_picture": current_user.get("profile_picture", ""),
        "created_at": current_user.get("created_at"),
        "updated_at": current_user.get("updated_at"),
    }
