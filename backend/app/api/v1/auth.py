"""Authentication routes (signup, login, current user)."""

import logging

from fastapi import APIRouter, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.config import get_settings
from app.core.security import (
    create_access_token,
    create_password_reset_token,
    decode_password_reset_token,
    hash_password,
    verify_password,
)
from app.dependencies.auth import CurrentUser
from app.dependencies.database import DbSession
from app.exceptions.app_exceptions import AppException
from app.models.user import User
from app.schemas.user import (
    AuthSessionResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    UserCreate,
    UserLogin,
    UserResponse,
)
from app.services.email_service import send_password_reset_email, smtp_configured

router = APIRouter()
logger = logging.getLogger(__name__)


def _normalize_email(email: str) -> str:
    return email.strip().lower()


async def _register_user(body: UserCreate, db: DbSession) -> AuthSessionResponse:
    user = User(
        email=_normalize_email(str(body.email)),
        password_hash=hash_password(body.password),
    )
    db.add(user)
    try:
        await db.flush()
        await db.refresh(user)
    except IntegrityError:
        raise AppException(
            "An account with this email already exists.",
            status_code=409,
            error_code="EMAIL_ALREADY_REGISTERED",
        ) from None
    token = create_access_token(subject=user.id)
    return AuthSessionResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post("/signup", response_model=AuthSessionResponse, status_code=status.HTTP_201_CREATED)
async def signup(body: UserCreate, db: DbSession) -> AuthSessionResponse:
    """Register a new user; password is stored hashed."""
    return await _register_user(body, db)


@router.post("/register", response_model=AuthSessionResponse, status_code=status.HTTP_201_CREATED)
async def register(body: UserCreate, db: DbSession) -> AuthSessionResponse:
    """Alias for ``/signup`` (frontend compatibility)."""
    return await _register_user(body, db)


@router.post("/login", response_model=AuthSessionResponse)
async def login(body: UserLogin, db: DbSession) -> AuthSessionResponse:
    """Verify credentials and return a JWT plus public user profile."""
    result = await db.execute(select(User).where(User.email == _normalize_email(str(body.email))))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(body.password, user.password_hash):
        raise AppException(
            "Incorrect email or password.",
            status_code=401,
            error_code="INVALID_CREDENTIALS",
        )
    token = create_access_token(subject=user.id)
    return AuthSessionResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
async def me(current_user: CurrentUser) -> User:
    """Return the authenticated user (requires `Authorization: Bearer <token>`)."""
    return current_user


@router.post(
    "/forgot-password",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    summary="Request password reset email",
)
async def forgot_password(body: ForgotPasswordRequest, db: DbSession) -> Response:
    """
    If an account exists for this email, send a reset link. Always returns 204 so
    callers cannot infer whether the address is registered.
    """
    email = _normalize_email(str(body.email))
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    settings = get_settings()
    base = settings.FRONTEND_BASE_URL.rstrip("/")

    if user is None:
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    token = create_password_reset_token(user.id)
    reset_url = f"{base}/reset-password?token={token}"

    if smtp_configured(settings):
        try:
            await send_password_reset_email(user.email, reset_url)
        except Exception:
            logger.exception("password_reset_email_failed", extra={"email": email})
    else:
        logger.warning(
            "password_reset_email_skipped_smtp_unset",
            extra={"email": email, "hint": "Set SMTP_* and FRONTEND_BASE_URL in .env"},
        )
        if settings.ENV == "dev":
            logger.info("password_reset_dev_link %s", reset_url)

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/reset-password",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    summary="Complete password reset",
)
async def reset_password(body: ResetPasswordRequest, db: DbSession) -> Response:
    """Apply a new password using the JWT from the forgot-password email."""
    user_id = decode_password_reset_token(body.token.strip())
    if user_id is None:
        raise AppException(
            "This reset link is invalid or has expired. Request a new one from the login page.",
            status_code=400,
            error_code="INVALID_RESET_TOKEN",
        )
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise AppException(
            "This reset link is invalid or has expired. Request a new one from the login page.",
            status_code=400,
            error_code="INVALID_RESET_TOKEN",
        )
    user.password_hash = hash_password(body.password)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    summary="Log out",
)
async def logout() -> Response:
    """
    Acknowledge logout. The client must discard stored JWTs.

    Access tokens are stateless and are not stored server-side, so they cannot be
    revoked here; sending ``Authorization: Bearer`` is optional but allows proxies
    or future audit hooks to identify the session being closed.
    """
    return Response(status_code=status.HTTP_204_NO_CONTENT)
