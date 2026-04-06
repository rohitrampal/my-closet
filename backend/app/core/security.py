"""Password hashing and JWT helpers (foundation; no auth routes)."""

import hashlib
from datetime import UTC, datetime, timedelta
from typing import Any

import bcrypt
from jose import JWTError, jwt

from app.config import get_settings

ALGORITHM = "HS256"

# bcrypt only accepts the first 72 bytes of the secret; longer UTF-8 passwords must be
# normalized first. Same preprocessing on hash and verify keeps existing <=72-byte
# passwords unchanged (still raw string → bcrypt).
_BCRYPT_MAX_BYTES = 72


def _bcrypt_plaintext(plain_password: str) -> str:
    raw = plain_password.encode("utf-8")
    if len(raw) <= _BCRYPT_MAX_BYTES:
        return plain_password
    return hashlib.sha256(raw).hexdigest()


def hash_password(plain_password: str) -> str:
    """Hash a password for storage (standard bcrypt $2b$ strings)."""
    plain = _bcrypt_plaintext(plain_password)
    digest = bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt())
    return digest.decode("ascii")


def verify_password(plain_password: str, password_hash: str) -> bool:
    """Verify a plain password against a stored hash."""
    plain = _bcrypt_plaintext(plain_password)
    return bcrypt.checkpw(plain.encode("utf-8"), password_hash.encode("ascii"))


def create_access_token(
    subject: str | int,
    expires_delta: timedelta | None = None,
    extra_claims: dict[str, Any] | None = None,
) -> str:
    """
    Create a signed JWT access token (placeholder for future auth).

    ``subject`` is typically a user id; ``extra_claims`` can hold roles, etc.
    """
    settings = get_settings()
    delta = expires_delta if expires_delta is not None else timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    expire = datetime.now(UTC) + delta
    payload: dict[str, Any] = {
        "sub": str(subject),
        "exp": expire,
        "iat": datetime.now(UTC),
        "type": "access",
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    """
    Decode and validate a JWT. Raises jose.JWTError on failure.

    Use in future dependencies when auth is implemented.
    """
    settings = get_settings()
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])


def safe_decode_token(token: str) -> dict[str, Any] | None:
    """Decode token without raising; returns None if invalid or expired."""
    try:
        return decode_access_token(token)
    except JWTError:
        return None


def create_password_reset_token(user_id: int) -> str:
    """Short-lived JWT for ``POST /auth/reset-password`` (not an access token)."""
    return create_access_token(
        subject=user_id,
        expires_delta=timedelta(hours=1),
        extra_claims={"type": "password_reset"},
    )


def decode_password_reset_token(token: str) -> int | None:
    """Return user id if token is a valid, non-expired password-reset JWT."""
    payload = safe_decode_token(token)
    if not payload or payload.get("type") != "password_reset":
        return None
    try:
        return int(payload["sub"])
    except (KeyError, TypeError, ValueError):
        return None
