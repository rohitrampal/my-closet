"""Add preferred/disliked category JSON maps to user_preferences.

Revision ID: g9h0i1j2k3l4
Revises: f6a7b8c9d0e1
Create Date: 2026-03-30

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "g9h0i1j2k3l4"
down_revision: str | Sequence[str] | None = "f6a7b8c9d0e1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "user_preferences",
        sa.Column(
            "preferred_categories",
            sa.JSON(),
            nullable=False,
            server_default=sa.text("'{}'::json"),
        ),
    )
    op.add_column(
        "user_preferences",
        sa.Column(
            "disliked_categories",
            sa.JSON(),
            nullable=False,
            server_default=sa.text("'{}'::json"),
        ),
    )


def downgrade() -> None:
    op.drop_column("user_preferences", "disliked_categories")
    op.drop_column("user_preferences", "preferred_categories")
