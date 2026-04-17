from __future__ import annotations

import asyncio
import json

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import server.auth as auth_module
import server.routers.auth as auth_router
import server.services.auth_challenge_store as challenge_store_module
from lib.db import get_async_session
from lib.db.base import Base
from lib.db.repositories.user_repository import UserRepository
from lib.i18n import get_translator
from tests.conftest import make_translator


async def _create_schema(engine) -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def _get_user(session_factory, *, email: str):
    async with session_factory() as session:
        repo = UserRepository(session)
        return await repo.get_by_email(email)


async def _create_user(
    session_factory,
    *,
    username: str,
    email: str,
    display_name: str,
    password_hash: str,
    is_email_verified: bool,
):
    async with session_factory() as session:
        repo = UserRepository(session)
        user = await repo.create(
            username=username,
            email=email,
            display_name=display_name,
            password_hash=password_hash,
            is_email_verified=is_email_verified,
        )
        await session.commit()
        return user


@pytest.fixture()
def client(tmp_path, monkeypatch):
    auth_module._cached_token_secret = None
    auth_module._cached_password_hash = None

    db_path = tmp_path / "auth-registration.db"
    engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}")
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    asyncio.run(_create_schema(engine))

    store = challenge_store_module.AuthChallengeStore()

    async def _issue_code(*, kind, subject, ttl_seconds=900, resend_interval_seconds=60):  # noqa: ARG001
        payload = {
            "code_hash": challenge_store_module._hash_code(subject, "111111"),
            "attempts": 0,
        }
        await store._backend.set(store._challenge_key(kind, subject), json.dumps(payload), ex=ttl_seconds)
        return "111111"

    store.issue_code = _issue_code  # type: ignore[method-assign]
    monkeypatch.setattr(challenge_store_module, "_challenge_store", store)

    async def _fake_send_email(*, to_email: str, subject: str, body: str) -> None:  # noqa: ARG001
        return None

    monkeypatch.setattr(auth_router, "send_email", _fake_send_email)
    monkeypatch.setenv("AUTH_TOKEN_SECRET", "test-router-secret-key-at-least-32-bytes-long")
    monkeypatch.setenv("AUTH_EMAIL_DEBUG", "false")
    monkeypatch.delenv("REDIS_URL", raising=False)

    app = FastAPI()
    app.include_router(auth_router.router, prefix="/api/v1")

    async def _override_session():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_async_session] = _override_session
    app.dependency_overrides[get_translator] = lambda: make_translator("en")

    with TestClient(app) as test_client:
        yield test_client, session_factory

    monkeypatch.setattr(challenge_store_module, "_challenge_store", None)
    asyncio.run(engine.dispose())


def test_register_does_not_persist_user_before_email_verification(client):
    test_client, session_factory = client
    payload = {
        "username": "pending-user",
        "email": "pending@example.com",
        "display_name": "Pending User",
        "password": "StoryforgeTest2026!",
    }

    response = test_client.post("/api/v1/auth/register", json=payload)

    assert response.status_code == 200
    assert response.json()["email_delivery"] == "sent"
    assert asyncio.run(_get_user(session_factory, email="pending@example.com")) is None

    login_response = test_client.post(
        "/api/v1/auth/token",
        data={"username": "pending-user", "password": "StoryforgeTest2026!"},
    )
    assert login_response.status_code == 403
    assert login_response.json()["detail"] == "Please verify your email before logging in"

    verify_response = test_client.post(
        "/api/v1/auth/verify-email/confirm",
        json={"email": "pending@example.com", "code": "111111"},
    )

    assert verify_response.status_code == 200
    user = asyncio.run(_get_user(session_factory, email="pending@example.com"))
    assert user is not None
    assert user.is_email_verified is True


def test_register_same_email_and_username_can_retry_before_verification(client):
    test_client, session_factory = client

    first_response = test_client.post(
        "/api/v1/auth/register",
        json={
            "username": "retry-user",
            "email": "retry@example.com",
            "display_name": "Retry One",
            "password": "StoryforgeTest2026!",
        },
    )
    second_response = test_client.post(
        "/api/v1/auth/register",
        json={
            "username": "retry-user",
            "email": "retry@example.com",
            "display_name": "Retry Two",
            "password": "StoryforgeTest2027!",
        },
    )

    assert first_response.status_code == 200
    assert second_response.status_code == 200
    assert asyncio.run(_get_user(session_factory, email="retry@example.com")) is None

    verify_response = test_client.post(
        "/api/v1/auth/verify-email/confirm",
        json={"email": "retry@example.com", "code": "111111"},
    )
    assert verify_response.status_code == 200

    login_response = test_client.post(
        "/api/v1/auth/token",
        data={"username": "retry-user", "password": "StoryforgeTest2027!"},
    )
    assert login_response.status_code == 200


def test_register_replaces_legacy_unverified_user_without_blocking(client):
    test_client, session_factory = client
    asyncio.run(
        _create_user(
            session_factory,
            username="legacy-user",
            email="legacy@example.com",
            display_name="Legacy User",
            password_hash=auth_module.hash_password("OldPassword2026!"),
            is_email_verified=False,
        )
    )

    response = test_client.post(
        "/api/v1/auth/register",
        json={
            "username": "legacy-user",
            "email": "legacy@example.com",
            "display_name": "Fresh User",
            "password": "StoryforgeFresh2027!",
        },
    )

    assert response.status_code == 200
    assert asyncio.run(_get_user(session_factory, email="legacy@example.com")) is None

    verify_response = test_client.post(
        "/api/v1/auth/verify-email/confirm",
        json={"email": "legacy@example.com", "code": "111111"},
    )
    assert verify_response.status_code == 200

    user = asyncio.run(_get_user(session_factory, email="legacy@example.com"))
    assert user is not None
    assert user.display_name == "Fresh User"
    assert user.is_email_verified is True

    login_response = test_client.post(
        "/api/v1/auth/token",
        data={"username": "legacy-user", "password": "StoryforgeFresh2027!"},
    )
    assert login_response.status_code == 200
