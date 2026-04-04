"""Health check endpoint."""

from fastapi import APIRouter

from app.config import get_settings
from app.schemas.common import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Liveness/readiness style check; includes configured environment name."""
    settings = get_settings()
    return HealthResponse(status="ok", environment=settings.ENV)
