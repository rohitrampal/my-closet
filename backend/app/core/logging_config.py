"""Structured JSON logging setup."""

import logging
import sys
from typing import Any

from pythonjsonlogger import jsonlogger

from app.config import get_settings


def setup_logging() -> None:
    """Configure root logger with JSON formatter and env-driven level."""
    settings = get_settings()
    level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

    handler = logging.StreamHandler(sys.stdout)
    formatter = jsonlogger.JsonFormatter(
        "%(asctime)s %(name)s %(levelname)s %(message)s",
        rename_fields={
            "levelname": "level",
            "asctime": "timestamp",
        },
    )
    handler.setFormatter(formatter)

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(level)

    # Reduce noise from third-party loggers in production-like setups
    logging.getLogger("uvicorn.access").setLevel(logging.INFO)


def log_extra(**kwargs: Any) -> dict[str, Any]:
    """Build a dict suitable for logger.info(..., extra=...)."""
    return kwargs
