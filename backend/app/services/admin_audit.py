"""Persist admin API changes for accountability and debugging."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.admin_action import AdminAction


async def log_admin_action(
    db: AsyncSession,
    admin_id: int,
    action_type: str,
    payload: Mapping[str, Any],
) -> AdminAction:
    """
    Insert one audit row. ``payload`` should be JSON-serializable (e.g.
    ``{"field": "ml_weight", "old": 4.0, "new": 5.0}``).
    """
    row = AdminAction(
        admin_id=admin_id,
        action_type=action_type,
        payload=dict(payload),
    )
    db.add(row)
    await db.flush()
    return row
