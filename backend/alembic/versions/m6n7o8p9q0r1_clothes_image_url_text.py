"""Widen clothes.image_url to TEXT for inline data URLs.

Revision ID: m6n7o8p9q0r1
Revises: l4m5n6o7p8q9r0
Create Date: 2026-04-04

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "m6n7o8p9q0r1"
down_revision: str | Sequence[str] | None = "l4m5n6o7p8q9r0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column(
        "clothes",
        "image_url",
        existing_type=sa.String(length=2048),
        type_=sa.Text(),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            "UPDATE clothes SET image_url = left(image_url, 2048) WHERE length(image_url) > 2048"
        )
    )
    op.alter_column(
        "clothes",
        "image_url",
        existing_type=sa.Text(),
        type_=sa.String(length=2048),
        existing_nullable=False,
    )
