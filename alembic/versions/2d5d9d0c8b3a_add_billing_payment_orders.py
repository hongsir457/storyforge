"""add billing payment orders

Revision ID: 2d5d9d0c8b3a
Revises: 9b450d7f6b01
Create Date: 2026-04-22 10:15:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "2d5d9d0c8b3a"
down_revision: str | Sequence[str] | None = "9b450d7f6b01"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "billing_payment_orders",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("provider", sa.String(length=32), server_default="stripe", nullable=False),
        sa.Column("status", sa.String(length=24), server_default="pending", nullable=False),
        sa.Column("currency", sa.String(length=8), server_default="USD", nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=True),
        sa.Column("checkout_session_id", sa.String(length=255), nullable=True),
        sa.Column("payment_intent_id", sa.String(length=255), nullable=True),
        sa.Column("checkout_url", sa.String(length=1024), nullable=True),
        sa.Column("failed_reason", sa.String(length=255), nullable=True),
        sa.Column("fulfilled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("checkout_session_id"),
        sa.UniqueConstraint("payment_intent_id"),
    )
    op.create_index(op.f("ix_billing_payment_orders_user_id"), "billing_payment_orders", ["user_id"], unique=False)
    op.create_index("idx_billing_payment_orders_status", "billing_payment_orders", ["status"], unique=False)
    op.create_index(
        "idx_billing_payment_orders_user_created_at",
        "billing_payment_orders",
        ["user_id", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("idx_billing_payment_orders_user_created_at", table_name="billing_payment_orders")
    op.drop_index("idx_billing_payment_orders_status", table_name="billing_payment_orders")
    op.drop_index(op.f("ix_billing_payment_orders_user_id"), table_name="billing_payment_orders")
    op.drop_table("billing_payment_orders")
