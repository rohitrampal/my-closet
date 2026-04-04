"""Initial schema (empty baseline).

Revision ID: f8a1c2d3e4b5
Revises:
Create Date: 2026-03-29

"""

from collections.abc import Sequence

# revision identifiers, used by Alembic.
revision: str = "f8a1c2d3e4b5"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add tables in future revisions."""
    pass


def downgrade() -> None:
    pass
