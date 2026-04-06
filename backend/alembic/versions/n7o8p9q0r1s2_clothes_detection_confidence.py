"""Add optional detection_confidence on clothes for outfit matcher.

Revision ID: n7o8p9q0r1s2
Revises: m6n7o8p9q0r1
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "n7o8p9q0r1s2"
down_revision: str | Sequence[str] | None = "m6n7o8p9q0r1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "clothes",
        sa.Column("detection_confidence", sa.Float(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("clothes", "detection_confidence")
