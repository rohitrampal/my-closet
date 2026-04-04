"""Stylist rollout percentage on system_settings.

Revision ID: l4m5n6o7p8q9r0
Revises: k3l4m5n6o7p8q9
Create Date: 2026-04-02

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "l4m5n6o7p8q9r0"
down_revision: str | Sequence[str] | None = "k3l4m5n6o7p8q9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "system_settings",
        sa.Column(
            "stylist_rollout_percentage",
            sa.Integer(),
            server_default=sa.text("100"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("system_settings", "stylist_rollout_percentage")
