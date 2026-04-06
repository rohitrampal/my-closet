"""Per-user daily outfit generation counts for free-tier quota.

Revision ID: o8p9q0r1s2t3
Revises: n7o8p9q0r1s2
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "o8p9q0r1s2t3"
down_revision: str | Sequence[str] | None = "n7o8p9q0r1s2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "user_outfit_generation_daily",
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("stat_date", sa.Date(), nullable=False),
        sa.Column("count", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id", "stat_date"),
    )


def downgrade() -> None:
    op.drop_table("user_outfit_generation_daily")
