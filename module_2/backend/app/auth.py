from __future__ import annotations

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.store import store

bearer_scheme = HTTPBearer(auto_error=False)


def require_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> str:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    username = store.user_for_token(credentials.credentials)
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return username


CurrentUser = Annotated[str, Depends(require_user)]
