from fastapi import APIRouter, HTTPException, status

from app.models import LoginRequest, TokenResponse
from app.store import store

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest) -> TokenResponse:
    token = store.authenticate(body.username, body.password)
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    return TokenResponse(access_token=token, token_type="bearer")
