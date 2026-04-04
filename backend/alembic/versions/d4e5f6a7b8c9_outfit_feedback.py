"""Outfit feedback for personalization.

Revision ID: d4e5f6a7b8c9
Revises: c7d8e9f0a1b2
Create Date: 2026-03-29

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "d4e5f6a7b8c9"
down_revision: str | Sequence[str] | None = "c7d8e9f0a1b2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "outfit_feedback",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("liked", sa.Boolean(), nullable=False),
        sa.Column("top_id", sa.Integer(), nullable=False),
        sa.Column("bottom_id", sa.Integer(), nullable=True),
        sa.Column("footwear_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["bottom_id"], ["clothes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["footwear_id"], ["clothes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["top_id"], ["clothes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_outfit_feedback_user_id", "outfit_feedback", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_outfit_feedback_user_id", table_name="outfit_feedback")
    op.drop_table("outfit_feedback")
