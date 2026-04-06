"""Global exception handlers."""

import logging
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from app.exceptions.app_exceptions import AppException
from app.schemas.common import ErrorDetail, ErrorResponse

logger = logging.getLogger(__name__)


def _error_body(
    error: str,
    message: str,
    details: list[ErrorDetail] | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return ErrorResponse(
        error=error,
        message=message,
        details=details,
        extra=extra,
    ).model_dump(exclude_none=True)


def register_exception_handlers(app: FastAPI) -> None:
    """Attach global handlers for consistent JSON errors."""

    @app.exception_handler(AppException)
    async def app_exception_handler(_request: Request, exc: AppException) -> JSONResponse:
        # Do not pass reserved LogRecord names in ``extra`` (e.g. ``message``, ``status``, ``module``).
        logger.warning(
            "app_exception code=%r http_status=%s detail=%r",
            exc.error_code,
            exc.status_code,
            exc.message,
        )
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_body(exc.error_code, exc.message, extra=exc.extra),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request,
        exc: RequestValidationError,
    ) -> JSONResponse:
        details: list[ErrorDetail] = []
        for err in exc.errors():
            loc = [str(x) for x in err.get("loc", ())]
            details.append(
                ErrorDetail(loc=loc, msg=err.get("msg", "Invalid"), type=err.get("type")),
            )

        path = request.url.path.rstrip("/")
        admin_settings_patch = request.method == "PATCH" and path.endswith("/admin/settings")
        if admin_settings_patch:
            first = details[0] if details else None
            field_hint = ""
            if first and first.loc:
                tail = [p for p in first.loc if p not in ("body", "query", "path")]
                if tail:
                    field_hint = f" ({'.'.join(tail)})"
            summary = (
                f"Invalid system settings{field_hint}: {first.msg}"
                if first
                else "Invalid system settings."
            )
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content=_error_body(
                    "INVALID_SYSTEM_SETTINGS",
                    summary,
                    details=details,
                ),
            )

        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=_error_body(
                "VALIDATION_ERROR",
                "Request validation failed",
                details=details,
            ),
        )

    @app.exception_handler(ValidationError)
    async def pydantic_validation_handler(_request: Request, exc: ValidationError) -> JSONResponse:
        details = [
            ErrorDetail(loc=[str(x) for x in e.get("loc", ())], msg=e.get("msg", ""), type=e.get("type"))
            for e in exc.errors()
        ]
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=_error_body("VALIDATION_ERROR", "Validation failed", details=details),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception(
            "unhandled_exception",
            extra={"path": request.url.path, "method": request.method},
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=_error_body(
                "INTERNAL_ERROR",
                "An unexpected error occurred",
                extra=None,
            ),
        )
