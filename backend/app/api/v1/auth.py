"""Authentication routes (signup, login, current user)."""

from fastapi import APIRouter, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.core.security import create_access_token, hash_password, verify_password
from app.dependencies.auth import CurrentUser
from app.dependencies.database import DbSession
from app.exceptions.app_exceptions import AppException
from app.models.user import User
from app.schemas.user import AuthSessionResponse, UserCreate, UserLogin, UserResponse

router = APIRouter()


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
