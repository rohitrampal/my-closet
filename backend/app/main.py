"""FastAPI application factory and ASGI entry."""

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.config import get_settings
from app.core.database import engine
from app.core.logging_config import setup_logging
from app.exceptions.handlers import register_exception_handlers

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Startup: logging. Shutdown: dispose async engine."""
    setup_logging()
    settings = get_settings()
    logger.info(
        "application_startup",
        extra={"environment": settings.ENV},
    )
    yield
    await engine.dispose()
    logger.info("application_shutdown")


def create_app() -> FastAPI:
    """Build FastAPI instance with middleware, routers, and exception handlers."""
    settings = get_settings()
    app = FastAPI(
        title="API",
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs" if settings.ENV == "dev" else None,
        redoc_url="/redoc" if settings.ENV == "dev" else None,
    )

    register_exception_handlers(app)

    origins = settings.cors_origin_list
    if origins == ["*"]:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=False,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    else:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    app.include_router(api_router)
    return app


app = create_app()
