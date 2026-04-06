"""Structured JSON logging setup."""

import logging
import sys
from typing import Any

from pythonjsonlogger import jsonlogger

from app.config import get_settings


class _SkipHealthAccessFilter(logging.Filter):
    """Drop uvicorn access lines for /health (Docker/K8s probes spam logs)."""

    def filter(self, record: logging.LogRecord) -> bool:
        if record.name != "uvicorn.access":
            return True
        try:
            msg = record.getMessage()
        except Exception:
            return True
        if "GET /health" in msg or "HEAD /health" in msg:
            return False
        return True


def _sqlalchemy_loggers_reset() -> None:
    """
    SQLAlchemy ``echo=True`` attaches its own handler to engine loggers while also
    propagating to root, which produces duplicate lines (plain + JSON). Clear child
    handlers so only the root JSON handler receives SQL events.
    """
    for name in (
        "sqlalchemy.engine",
        "sqlalchemy.engine.Engine",
        "sqlalchemy.pool",
        "sqlalchemy.dialects",
    ):
        log = logging.getLogger(name)
        log.handlers.clear()
        log.propagate = True


def _attach_access_filters(flt: logging.Filter) -> None:
    access = logging.getLogger("uvicorn.access")
    for h in access.handlers:
        h.addFilter(flt)


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

    _sqlalchemy_loggers_reset()

    # Reduce noise from third-party loggers in production-like setups
    logging.getLogger("uvicorn.access").setLevel(logging.INFO)
    _attach_access_filters(_SkipHealthAccessFilter())


def log_extra(**kwargs: Any) -> dict[str, Any]:
    """Build a dict suitable for logger.info(..., extra=...)."""
    return kwargs
