"""Billing balance and ledger models."""

from __future__ import annotations

from datetime import datetime

import sqlalchemy as sa
from sqlalchemy import Float, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from lib.db.base import Base, TimestampMixin


class BillingAccount(TimestampMixin, Base):
    __tablename__ = "billing_accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(
        String,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    currency: Mapped[str] = mapped_column(String(8), nullable=False, server_default="USD")
    balance: Mapped[float] = mapped_column(Float, nullable=False, server_default="0.0")

    __table_args__ = (
        UniqueConstraint("user_id", "currency", name="uq_billing_accounts_user_currency"),
    )


class BillingTransaction(TimestampMixin, Base):
    __tablename__ = "billing_transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(
        String,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    account_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("billing_accounts.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    entry_type: Mapped[str] = mapped_column(String(24), nullable=False)
    currency: Mapped[str] = mapped_column(String(8), nullable=False, server_default="USD")
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    balance_after: Mapped[float] = mapped_column(Float, nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source_type: Mapped[str | None] = mapped_column(String(32), nullable=True)
    source_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    reference_key: Mapped[str | None] = mapped_column(String(128), nullable=True, unique=True)

    __table_args__ = (
        Index("idx_billing_transactions_user_created_at", "user_id", "created_at"),
        Index("idx_billing_transactions_entry_type", "entry_type"),
        Index("idx_billing_transactions_source", "source_type", "source_id"),
        Index("idx_billing_transactions_currency", "currency"),
    )


class BillingPaymentOrder(TimestampMixin, Base):
    __tablename__ = "billing_payment_orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(
        String,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    provider: Mapped[str] = mapped_column(String(32), nullable=False, server_default="stripe")
    status: Mapped[str] = mapped_column(String(24), nullable=False, server_default="pending")
    currency: Mapped[str] = mapped_column(String(8), nullable=False, server_default="USD")
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    checkout_session_id: Mapped[str | None] = mapped_column(String(255), nullable=True, unique=True)
    payment_intent_id: Mapped[str | None] = mapped_column(String(255), nullable=True, unique=True)
    checkout_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    failed_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    fulfilled_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("idx_billing_payment_orders_user_created_at", "user_id", "created_at"),
        Index("idx_billing_payment_orders_status", "status"),
    )
