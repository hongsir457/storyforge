"""expand users for managed auth

Revision ID: f5c5f38e6d7b
Revises: 548f6ca3e91c
Create Date: 2026-04-15 12:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f5c5f38e6d7b"
down_revision: str | Sequence[str] | None = "548f6ca3e91c"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.add_column(sa.Column("email", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("display_name", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("password_hash", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("is_email_verified", sa.Boolean(), server_default=sa.false(), nullable=False))
        batch_op.add_column(sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True))

    op.execute(
        sa.text(
            "UPDATE users "
            "SET email = COALESCE(NULLIF(email, ''), LOWER(username || '@storyforge.local')), "
            "display_name = COALESCE(NULLIF(display_name, ''), username), "
            "password_hash = COALESCE(password_hash, ''), "
            "is_email_verified = 1"
        )
    )

    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.alter_column("email", existing_type=sa.String(), nullable=False)
        batch_op.alter_column("display_name", existing_type=sa.String(), nullable=False)
        batch_op.alter_column("password_hash", existing_type=sa.String(), nullable=False)
        batch_op.create_unique_constraint("uq_users_email", ["email"])


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_constraint("uq_users_email", type_="unique")
        batch_op.drop_column("last_login_at")
        batch_op.drop_column("is_email_verified")
        batch_op.drop_column("password_hash")
        batch_op.drop_column("display_name")
        batch_op.drop_column("email")
