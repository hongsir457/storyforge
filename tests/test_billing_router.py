"""Router tests for billing APIs."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.testclient import TestClient
import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from lib.db import get_async_session
from lib.db.base import Base
from lib.db.models.user import User
from lib.db.repositories.billing_repo import BillingRepository
from server.auth import CurrentUserInfo, get_current_user
from server.dependencies import get_config_service
from server.routers import billing

ADMIN_ID = "admin-id"
USER_ID = "writer-id"


class _ConfigStub:
    def __init__(self, settings: dict[str, str] | None = None):
        self.settings = dict(settings or {})

    async def get_all_settings(self) -> dict[str, str]:
        return dict(self.settings)


@pytest.fixture
def billing_app():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    factory = async_sessionmaker(engine, expire_on_commit=False)
    config_stub = _ConfigStub(
        {
            "stripe_secret_key": "sk_test_router_secret",
            "stripe_webhook_secret": "whsec_router_secret",
            "public_app_url": "https://storyforge.example.com",
        }
    )

    @asynccontextmanager
    async def _lifespan(_app: FastAPI):
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        async with factory() as session:
            admin = User(
                id=ADMIN_ID,
                username="admin",
                email="admin@example.com",
                display_name="Admin",
                password_hash="pw",
                role="admin",
                is_active=True,
                is_email_verified=True,
            )
            user = User(
                id=USER_ID,
                username="writer",
                email="writer@example.com",
                display_name="Writer",
                password_hash="pw",
                role="user",
                is_active=True,
                is_email_verified=True,
            )
            session.add_all([admin, user])
            await session.flush()
            billing_repo = BillingRepository(session)
            await billing_repo.topup_user(user_id=user.id, amount=25, currency="USD", description="Initial credit")
            await session.commit()
        yield
        await engine.dispose()

    app = FastAPI(lifespan=_lifespan)

    async def _override_session():
        async with factory() as session:
            yield session

    app.dependency_overrides[get_async_session] = _override_session
    app.dependency_overrides[get_config_service] = lambda: config_stub
    app.include_router(billing.router, prefix="/api/v1")
    app.state.config_stub = config_stub
    return app


def _client(app: FastAPI, *, role: str, user_id: str, username: str, email: str):
    app.dependency_overrides[get_current_user] = lambda: CurrentUserInfo(
        id=user_id,
        sub=username,
        username=username,
        email=email,
        role=role,
    )
    return TestClient(app)


class TestBillingRouter:
    def test_user_can_fetch_own_billing_summary(self, billing_app):
        with _client(
            billing_app,
            role="user",
            user_id=USER_ID,
            username="writer",
            email="writer@example.com",
        ) as client:
            res = client.get("/api/v1/billing/me")

        assert res.status_code == 200
        body = res.json()
        assert body["balances"][0]["currency"] == "USD"
        assert body["balances"][0]["balance"] == pytest.approx(25)
        assert body["recent_transactions"][0]["entry_type"] == "topup"
        assert body["recent_orders"] == []

    def test_user_can_create_checkout_session(self, billing_app, monkeypatch: pytest.MonkeyPatch):
        recorded: dict[str, object] = {}

        def _fake_create(**kwargs):
            recorded.update(kwargs)
            return {"id": "cs_test_created", "url": "https://checkout.stripe.test/session"}

        monkeypatch.setattr(billing.stripe.checkout.Session, "create", _fake_create)

        with _client(
            billing_app,
            role="user",
            user_id=USER_ID,
            username="writer",
            email="writer@example.com",
        ) as client:
            res = client.post("/api/v1/billing/checkout/session", json={"package_id": "creator-25"})

        assert res.status_code == 200
        body = res.json()
        assert body["checkout_url"] == "https://checkout.stripe.test/session"
        assert body["order"]["status"] == "open"
        assert recorded["client_reference_id"] == str(body["order"]["id"])
        assert recorded["success_url"] == "https://storyforge.example.com/app/billing/return?session_id={CHECKOUT_SESSION_ID}"
        assert recorded["cancel_url"] == "https://storyforge.example.com/app/billing/return?status=cancelled"

    def test_status_endpoint_fulfills_successful_checkout(self, billing_app, monkeypatch: pytest.MonkeyPatch):
        def _fake_create(**_kwargs):
            return {"id": "cs_test_status", "url": "https://checkout.stripe.test/status"}

        def _fake_retrieve(session_id: str):
            return {
                "id": session_id,
                "status": "complete",
                "payment_status": "paid",
                "payment_intent": "pi_test_status",
                "url": "https://checkout.stripe.test/status",
                "metadata": {"order_id": "2"},
            }

        monkeypatch.setattr(billing.stripe.checkout.Session, "create", _fake_create)
        monkeypatch.setattr(billing.stripe.checkout.Session, "retrieve", _fake_retrieve)

        with _client(
            billing_app,
            role="user",
            user_id=USER_ID,
            username="writer",
            email="writer@example.com",
        ) as client:
            create_res = client.post("/api/v1/billing/checkout/session", json={"package_id": "creator-25"})
            assert create_res.status_code == 200
            status_res = client.get("/api/v1/billing/checkout/session-status?session_id=cs_test_status")
            summary_res = client.get("/api/v1/billing/me")

        assert status_res.status_code == 200
        status_body = status_res.json()
        assert status_body["order"]["status"] == "paid"
        assert status_body["stripe_payment_status"] == "paid"

        assert summary_res.status_code == 200
        balances = summary_res.json()["balances"]
        assert balances[0]["balance"] == pytest.approx(50)

    def test_webhook_marks_checkout_paid_and_credits_balance(self, billing_app, monkeypatch: pytest.MonkeyPatch):
        def _fake_create(**_kwargs):
            return {"id": "cs_test_hook", "url": "https://checkout.stripe.test/hook"}

        def _fake_construct_event(_payload, _signature, _secret):
            return {
                "type": "checkout.session.completed",
                "data": {"object": {"id": "cs_test_hook", "payment_intent": "pi_test_hook"}},
            }

        def _fake_retrieve(session_id: str):
            return {
                "id": session_id,
                "status": "complete",
                "payment_status": "paid",
                "payment_intent": "pi_test_hook",
                "url": "https://checkout.stripe.test/hook",
                "metadata": {"order_id": "2"},
            }

        monkeypatch.setattr(billing.stripe.checkout.Session, "create", _fake_create)
        monkeypatch.setattr(billing.stripe.Webhook, "construct_event", _fake_construct_event)
        monkeypatch.setattr(billing.stripe.checkout.Session, "retrieve", _fake_retrieve)

        with _client(
            billing_app,
            role="user",
            user_id=USER_ID,
            username="writer",
            email="writer@example.com",
        ) as client:
            create_res = client.post("/api/v1/billing/checkout/session", json={"package_id": "creator-25"})
            assert create_res.status_code == 200
            webhook_res = client.post(
                "/api/v1/billing/stripe/webhook",
                content=b"{}",
                headers={"stripe-signature": "sig_test"},
            )
            summary_res = client.get("/api/v1/billing/me")

        assert webhook_res.status_code == 200
        assert webhook_res.json() == {"received": True}
        assert summary_res.status_code == 200
        balances = summary_res.json()["balances"]
        assert balances[0]["balance"] == pytest.approx(50)

    def test_admin_can_topup_and_view_overview(self, billing_app):
        with _client(
            billing_app,
            role="admin",
            user_id=ADMIN_ID,
            username="admin",
            email="admin@example.com",
        ) as client:
            topup = client.post(
                "/api/v1/billing/admin/topups",
                json={
                    "user_id": USER_ID,
                    "amount": 5,
                    "currency": "USD",
                    "note": "Bonus",
                },
            )
            assert topup.status_code == 200
            assert topup.json()["transaction"]["amount"] == pytest.approx(5)

            overview = client.get("/api/v1/billing/admin/overview")

        assert overview.status_code == 200
        body = overview.json()
        target = next(user for user in body["users"] if user["username"] == "writer")
        usd_balance = next(balance for balance in target["balances"] if balance["currency"] == "USD")
        assert usd_balance["balance"] == pytest.approx(30)

    def test_non_admin_cannot_topup(self, billing_app):
        with _client(
            billing_app,
            role="user",
            user_id=USER_ID,
            username="writer",
            email="writer@example.com",
        ) as client:
            res = client.post(
                "/api/v1/billing/admin/topups",
                json={
                    "user_id": USER_ID,
                    "amount": 5,
                    "currency": "USD",
                },
            )

        assert res.status_code == 403
        assert res.json()["detail"] == "Admin access required"
