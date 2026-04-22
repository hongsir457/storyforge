"""Tests for billing repository helpers."""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from lib.db.base import Base
from lib.db.models import BillingTransaction
from lib.db.repositories.billing_repo import BillingRepository
from lib.db.repositories.user_repository import UserRepository


@pytest.fixture
async def engine():
    eng = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    await eng.dispose()


@pytest.fixture
async def db_session(engine):
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        yield session


async def _create_user(session, *, username: str = "writer", email: str = "writer@example.com"):
    repo = UserRepository(session)
    user = await repo.create(
        username=username,
        email=email,
        display_name=username.title(),
        password_hash="pw",
        role="user",
        is_active=True,
        is_email_verified=True,
    )
    await session.commit()
    return user


class TestBillingRepository:
    async def test_topup_and_charge_adjust_balance(self, db_session):
        user = await _create_user(db_session)
        repo = BillingRepository(db_session)

        await repo.topup_user(user_id=user.id, amount=100, currency="USD", description="Seed funding")
        await repo.charge_api_call(user_id=user.id, api_call_id=11, amount=3.25, currency="USD")
        await db_session.commit()

        balances = await repo.list_user_balances(user.id)
        assert balances == [
            {
                "currency": "USD",
                "balance": pytest.approx(96.75),
                "updated_at": balances[0]["updated_at"],
            }
        ]

        transactions = await repo.list_user_transactions(user.id)
        assert len(transactions) == 2
        assert transactions[0]["entry_type"] == "charge"
        assert transactions[0]["amount"] == pytest.approx(-3.25)
        assert transactions[1]["entry_type"] == "topup"
        assert transactions[1]["amount"] == pytest.approx(100)

    async def test_charge_api_call_is_idempotent(self, db_session):
        user = await _create_user(db_session)
        repo = BillingRepository(db_session)

        await repo.topup_user(user_id=user.id, amount=10, currency="USD")
        first = await repo.charge_api_call(user_id=user.id, api_call_id=42, amount=1.5, currency="USD")
        second = await repo.charge_api_call(user_id=user.id, api_call_id=42, amount=1.5, currency="USD")
        await db_session.commit()

        assert first is not None
        assert second is not None
        assert first.id == second.id

        balances = await repo.list_user_balances(user.id)
        assert balances[0]["balance"] == pytest.approx(8.5)

        tx_rows = await db_session.execute(
            BillingTransaction.__table__.select().where(BillingTransaction.user_id == user.id)
        )
        assert len(tx_rows.all()) == 2

    async def test_admin_overview_returns_users_and_recent_transactions(self, db_session):
        user = await _create_user(db_session)
        repo = BillingRepository(db_session)

        await repo.topup_user(user_id=user.id, amount=50, currency="CNY", description="Manual topup")
        await db_session.commit()

        overview = await repo.get_admin_overview()
        assert overview["users"][0]["username"] == user.username
        assert overview["users"][0]["balances"][0]["currency"] == "CNY"
        assert overview["recent_transactions"][0]["username"] == user.username
        assert overview["recent_transactions"][0]["amount"] == pytest.approx(50)

    async def test_checkout_order_is_fulfilled_once(self, db_session):
        user = await _create_user(db_session)
        repo = BillingRepository(db_session)

        order = await repo.create_payment_order(
            user_id=user.id,
            amount=25,
            currency="USD",
            provider="stripe",
            description="Stripe top-up",
        )
        await repo.attach_checkout_session(
            order=order, checkout_session_id="cs_test_123", checkout_url="https://checkout"
        )
        first = await repo.fulfill_checkout_order(order, checkout_session_id="cs_test_123", payment_intent_id="pi_123")
        second = await repo.fulfill_checkout_order(order, checkout_session_id="cs_test_123", payment_intent_id="pi_123")
        await db_session.commit()

        assert first.id == second.id

        balances = await repo.list_user_balances(user.id)
        assert balances[0]["balance"] == pytest.approx(25)

        tx_rows = await db_session.execute(
            BillingTransaction.__table__.select().where(BillingTransaction.user_id == user.id)
        )
        assert len(tx_rows.all()) == 1

        stored_order = await repo.get_payment_order(order.id)
        assert stored_order is not None
        assert stored_order.status == "paid"
