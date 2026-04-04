"""Application-specific exceptions."""

from typing import Any


class AppException(Exception):
    """Base exception with HTTP status and error code for handlers."""

    def __init__(
        self,
        message: str,
        *,
        status_code: int = 400,
        error_code: str = "APP_ERROR",
        extra: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.extra = extra
