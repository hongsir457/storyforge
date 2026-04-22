"""add billing accounts and transactions

Revision ID: 9b450d7f6b01
Revises: f5c5f38e6d7b
Create Date: 2026-04-21 18:30:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "9b450d7f6b01"
down_revision: str | Sequence[str] | None = "f5c5f38e6d7b"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "billing_accounts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("currency", sa.String(length=8), server_default="USD", nullable=False),
        sa.Column("balance", sa.Float(), server_default="0.0", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "currency", name="uq_billing_accounts_user_currency"),
    )
    op.create_index(op.f("ix_billing_accounts_user_id"), "billing_accounts", ["user_id"], unique=False)

    op.create_table(
        "billing_transactions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("account_id", sa.Integer(), nullable=True),
        sa.Column("entry_type", sa.String(length=24), nullable=False),
        sa.Column("currency", sa.String(length=8), server_default="USD", nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("balance_after", sa.Float(), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=True),
        sa.Column("source_type", sa.String(length=32), nullable=True),
        sa.Column("source_id", sa.String(length=64), nullable=True),
        sa.Column("reference_key", sa.String(length=128), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["account_id"], ["billing_accounts.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("reference_key"),
    )
    op.create_index(op.f("ix_billing_transactions_account_id"), "billing_transactions", ["account_id"], unique=False)
    op.create_index(op.f("ix_billing_transactions_user_id"), "billing_transactions", ["user_id"], unique=False)
    op.create_index("idx_billing_transactions_currency", "billing_transactions", ["currency"], unique=False)
    op.create_index("idx_billing_transactions_entry_type", "billing_transactions", ["entry_type"], unique=False)
    op.create_index(
        "idx_billing_transactions_source",
        "billing_transactions",
        ["source_type", "source_id"],
        unique=False,
    )
    op.create_index(
        "idx_billing_transactions_user_created_at",
        "billing_transactions",
        ["user_id", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("idx_billing_transactions_user_created_at", table_name="billing_transactions")
    op.drop_index("idx_billing_transactions_source", table_name="billing_transactions")
    op.drop_index("idx_billing_transactions_entry_type", table_name="billing_transactions")
    op.drop_index("idx_billing_transactions_currency", table_name="billing_transactions")
    op.drop_index(op.f("ix_billing_transactions_user_id"), table_name="billing_transactions")
    op.drop_index(op.f("ix_billing_transactions_account_id"), table_name="billing_transactions")
    op.drop_table("billing_transactions")

    op.drop_index(op.f("ix_billing_accounts_user_id"), table_name="billing_accounts")
    op.drop_table("billing_accounts")
