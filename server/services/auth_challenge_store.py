"""Short-lived auth challenge storage backed by Redis or in-memory fallback."""

from __future__ import annotations

import asyncio
import hashlib
import json
import os
import secrets
import time
from typing import Literal

from redis.asyncio import Redis

ChallengeKind = Literal["verify_email", "password_reset"]


class ChallengeRateLimitedError(RuntimeError):
    """Raised when a new challenge is requested too frequently."""


def _normalize_subject(subject: str) -> str:
    return subject.strip().lower()


def _hash_code(subject: str, code: str) -> str:
    material = f"{_normalize_subject(subject)}:{code}".encode("utf-8")
    return hashlib.sha256(material).hexdigest()


class _InMemoryStore:
    def __init__(self) -> None:
        self._values: dict[str, tuple[str, float]] = {}
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> str | None:
        async with self._lock:
            item = self._values.get(key)
            if item is None:
                return None
            value, expires_at = item
            if expires_at <= time.time():
                self._values.pop(key, None)
                return None
            return value

    async def set(self, key: str, value: str, ex: int) -> None:
        async with self._lock:
            self._values[key] = (value, time.time() + ex)

    async def delete(self, key: str) -> None:
        async with self._lock:
            self._values.pop(key, None)

    async def ttl(self, key: str) -> int:
        async with self._lock:
            item = self._values.get(key)
            if item is None:
                return -2
            _, expires_at = item
            remaining = int(expires_at - time.time())
            if remaining <= 0:
                self._values.pop(key, None)
                return -2
            return remaining


class AuthChallengeStore:
    def __init__(self, redis_url: str | None = None) -> None:
        normalized = (redis_url or os.environ.get("REDIS_URL", "")).strip()
        self._backend: Redis | _InMemoryStore
        if normalized:
            self._backend = Redis.from_url(normalized, decode_responses=True)
        else:
            self._backend = _InMemoryStore()

    def _challenge_key(self, kind: ChallengeKind, subject: str) -> str:
        return f"storyforge:auth:{kind}:{_normalize_subject(subject)}"

    def _cooldown_key(self, kind: ChallengeKind, subject: str) -> str:
        return f"storyforge:auth:cooldown:{kind}:{_normalize_subject(subject)}"

    async def issue_code(
        self,
        *,
        kind: ChallengeKind,
        subject: str,
        ttl_seconds: int = 900,
        resend_interval_seconds: int = 60,
    ) -> str:
        cooldown_key = self._cooldown_key(kind, subject)
        if await self._backend.get(cooldown_key):
            raise ChallengeRateLimitedError("Challenge requested too frequently")

        code = "".join(secrets.choice("0123456789") for _ in range(6))
        payload = {
            "code_hash": _hash_code(subject, code),
            "attempts": 0,
        }
        await self._backend.set(self._challenge_key(kind, subject), json.dumps(payload), ex=ttl_seconds)
        await self._backend.set(cooldown_key, "1", ex=resend_interval_seconds)
        return code

    async def verify_code(
        self,
        *,
        kind: ChallengeKind,
        subject: str,
        code: str,
        max_attempts: int = 5,
    ) -> bool:
        key = self._challenge_key(kind, subject)
        raw = await self._backend.get(key)
        if raw is None:
            return False

        payload = json.loads(raw)
        expected_hash = payload.get("code_hash", "")
        if secrets.compare_digest(expected_hash, _hash_code(subject, code.strip())):
            await self._backend.delete(key)
            return True

        attempts = int(payload.get("attempts", 0)) + 1
        if attempts >= max_attempts:
            await self._backend.delete(key)
            return False

        payload["attempts"] = attempts
        ttl = await self._backend.ttl(key)
        await self._backend.set(key, json.dumps(payload), ex=max(ttl, 1))
        return False

    async def consume(self, *, kind: ChallengeKind, subject: str) -> None:
        await self._backend.delete(self._challenge_key(kind, subject))


_challenge_store: AuthChallengeStore | None = None


def get_auth_challenge_store() -> AuthChallengeStore:
    global _challenge_store
    if _challenge_store is None:
        _challenge_store = AuthChallengeStore()
    return _challenge_store
