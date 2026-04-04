"""Create users and clothes tables.

Revision ID: c7d8e9f0a1b2
Revises: f8a1c2d3e4b5
Create Date: 2026-03-29

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c7d8e9f0a1b2"
down_revision: str | Sequence[str] | None = "f8a1c2d3e4b5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


clothes_type_enum = sa.Enum(
    "top",
    "bottom",
    "dress",
    "outerwear",
    "footwear",
    "accessory",
    name="clothes_type_enum",
)


def upgrade() -> None:
    bind = op.get_bind()
    clothes_type_enum.create(bind, checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )

    op.create_table(
        "clothes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("image_url", sa.String(length=2048), nullable=False),
        sa.Column("clothes_type", clothes_type_enum, nullable=False),
        sa.Column("color", sa.String(length=100), nullable=False),
        sa.Column("style", sa.String(length=100), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_clothes_user_id", "clothes", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_clothes_user_id", table_name="clothes")
    op.drop_table("clothes")
    op.drop_table("users")
    bind = op.get_bind()
    clothes_type_enum.drop(bind, checkfirst=True)
