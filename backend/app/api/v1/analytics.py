"""Public analytics event ingestion (optional auth)."""

from fastapi import APIRouter, Response, status

from app.dependencies.auth import OptionalCurrentUser
from app.dependencies.database import DbSession
from app.models.analytics_event import AnalyticsEvent
from app.schemas.analytics import AnalyticsEventIn

router = APIRouter()


@router.post("/event", status_code=status.HTTP_204_NO_CONTENT)
async def ingest_analytics_event(
    body: AnalyticsEventIn,
    db: DbSession,
    current_user: OptionalCurrentUser,
) -> Response:
    """Record one product analytics event; user is linked when a valid Bearer token is sent."""
    row = AnalyticsEvent(
        user_id=current_user.id if current_user is not None else None,
        event_name=body.event_name,
        event_metadata=body.metadata,
    )
    db.add(row)
    await db.flush()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
