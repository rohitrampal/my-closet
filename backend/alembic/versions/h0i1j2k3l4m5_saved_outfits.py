"""Saved outfits (user bookmarks).

Revision ID: h0i1j2k3l4m5
Revises: g9h0i1j2k3l4
Create Date: 2026-04-01

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "h0i1j2k3l4m5"
down_revision: str | Sequence[str] | None = "g9h0i1j2k3l4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "saved_outfits",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
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
    op.create_index("ix_saved_outfits_user_id", "saved_outfits", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_saved_outfits_user_id", table_name="saved_outfits")
    op.drop_table("saved_outfits")
