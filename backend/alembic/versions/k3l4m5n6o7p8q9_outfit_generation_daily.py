"""Daily outfit generation aggregates for analytics.

Revision ID: k3l4m5n6o7p8q9
Revises: j2k3l4m5n6o7p8
Create Date: 2026-04-02

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "k3l4m5n6o7p8q9"
down_revision: str | Sequence[str] | None = "j2k3l4m5n6o7p8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "outfit_generation_daily",
        sa.Column("stat_date", sa.Date(), nullable=False),
        sa.Column("count", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.PrimaryKeyConstraint("stat_date"),
    )


def downgrade() -> None:
    op.drop_table("outfit_generation_daily")
