"""Razorpay webhook idempotency table.

Revision ID: q0r1s2t3u4v5
Revises: p9q0r1s2t3u4
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "q0r1s2t3u4v5"
down_revision: str | Sequence[str] | None = "p9q0r1s2t3u4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "razorpay_webhook_payments",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("razorpay_payment_id", sa.String(length=64), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("razorpay_order_id", sa.String(length=64), nullable=False),
        sa.Column("amount_paise", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("razorpay_payment_id", name="uq_razorpay_webhook_payments_payment_id"),
    )


def downgrade() -> None:
    op.drop_table("razorpay_webhook_payments")
