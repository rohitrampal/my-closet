"""Admin flag on users and singleton system_settings.

Revision ID: i1j2k3l4m5n6
Revises: h0i1j2k3l4m5
Create Date: 2026-04-02

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "i1j2k3l4m5n6"
down_revision: str | Sequence[str] | None = "h0i1j2k3l4m5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("is_admin", sa.Boolean(), server_default=sa.text("false"), nullable=False),
    )
    op.create_table(
        "system_settings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("ml_exploration_rate", sa.Float(), server_default=sa.text("0.2"), nullable=False),
        sa.Column("ml_weight", sa.Float(), server_default=sa.text("4.0"), nullable=False),
        sa.Column("feature_ai_tagging", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("feature_stylist_mode", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("outfits_generated_total", sa.BigInteger(), server_default=sa.text("0"), nullable=False),
        sa.CheckConstraint("id = 1", name="ck_system_settings_singleton"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.execute(sa.text("INSERT INTO system_settings (id) VALUES (1)"))


def downgrade() -> None:
    op.drop_table("system_settings")
    op.drop_column("users", "is_admin")
