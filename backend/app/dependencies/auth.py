"""Current user from `Authorization: Bearer` JWT."""

from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select

from app.core.security import decode_access_token
from app.dependencies.database import DbSession
from app.exceptions.app_exceptions import AppException
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    db: DbSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> User:
    """Resolve the authenticated user via JWT decode (access tokens only)."""
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise AppException(
            "Authentication required. Send a Bearer token in the Authorization header.",
            status_code=401,
            error_code="UNAUTHENTICATED",
        )
    try:
        payload = decode_access_token(credentials.credentials)
    except JWTError:
        raise AppException(
            "Invalid or expired access token.",
            status_code=401,
            error_code="INVALID_TOKEN",
        ) from None
    if payload.get("type") != "access":
        raise AppException(
            "Invalid token type.",
            status_code=401,
            error_code="INVALID_TOKEN",
        )
    sub = payload.get("sub")
    if sub is None:
        raise AppException(
            "Token payload is missing subject.",
            status_code=401,
            error_code="INVALID_TOKEN",
        )
    try:
        user_id = int(sub)
    except (TypeError, ValueError) as exc:
        raise AppException(
            "Invalid token subject.",
            status_code=401,
            error_code="INVALID_TOKEN",
        ) from exc

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise AppException(
            "User no longer exists or token is invalid.",
            status_code=401,
            error_code="USER_NOT_FOUND",
        )
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


async def get_current_admin(current_user: CurrentUser) -> User:
    if not current_user.is_admin:
        raise AppException(
            "Admin access required.",
            status_code=403,
            error_code="FORBIDDEN_NOT_ADMIN",
        )
    return current_user


CurrentAdmin = Annotated[User, Depends(get_current_admin)]
