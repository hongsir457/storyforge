"""Authentication helpers for JWT, API keys, and bootstrap admin creation."""

from __future__ import annotations

import hashlib
import logging
import os
import secrets
import string
import time
from collections import OrderedDict
from datetime import UTC, datetime
from pathlib import Path
from typing import Annotated, Any

import jwt
from fastapi import Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer
from pwdlib import PasswordHash
from pydantic import BaseModel, ConfigDict

from lib import PROJECT_ROOT
from lib.db.base import DEFAULT_USER_ID

logger = logging.getLogger(__name__)


class CurrentUserInfo(BaseModel):
    """Authenticated user information exposed to route handlers."""

    id: str
    sub: str
    role: str = "admin"
    username: str | None = None
    email: str | None = None
    display_name: str | None = None
    is_email_verified: bool = True

    model_config = ConfigDict(frozen=True)


_cached_token_secret: str | None = None
_cached_password_hash: str | None = None

TOKEN_EXPIRY_SECONDS = 7 * 24 * 3600
DOWNLOAD_TOKEN_EXPIRY_SECONDS = 300
API_KEY_PREFIX = "arc-"
API_KEY_CACHE_TTL = 300

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token", auto_error=False)

_password_hash = PasswordHash.recommended()


def generate_password(length: int = 16) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def hash_password(password: str) -> str:
    return _password_hash.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _password_hash.verify(password, password_hash)
    except Exception:
        return False


def get_token_secret() -> str:
    global _cached_token_secret

    env_secret = os.environ.get("AUTH_TOKEN_SECRET")
    if env_secret:
        return env_secret

    if _cached_token_secret is None:
        _cached_token_secret = secrets.token_hex(32)
        logger.info("Generated transient JWT signing secret")
    return _cached_token_secret


def create_token(
    username: str,
    *,
    user_id: str = DEFAULT_USER_ID,
    role: str = "admin",
    email: str | None = None,
    display_name: str | None = None,
    email_verified: bool = True,
) -> str:
    now = time.time()
    payload: dict[str, Any] = {
        "sub": username,
        "uid": user_id,
        "role": role,
        "username": username,
        "email_verified": email_verified,
        "iat": now,
        "exp": now + TOKEN_EXPIRY_SECONDS,
    }
    if email:
        payload["email"] = email
    if display_name:
        payload["display_name"] = display_name
    return jwt.encode(payload, get_token_secret(), algorithm="HS256")


def verify_token(token: str) -> dict[str, Any] | None:
    try:
        return jwt.decode(token, get_token_secret(), algorithms=["HS256"])
    except (jwt.InvalidTokenError, jwt.ExpiredSignatureError):
        return None


def create_download_token(username: str, project_name: str) -> str:
    now = time.time()
    payload = {
        "sub": username,
        "project": project_name,
        "purpose": "download",
        "iat": now,
        "exp": now + DOWNLOAD_TOKEN_EXPIRY_SECONDS,
    }
    return jwt.encode(payload, get_token_secret(), algorithm="HS256")


def verify_download_token(token: str, project_name: str) -> dict[str, Any]:
    payload = jwt.decode(token, get_token_secret(), algorithms=["HS256"])
    if payload.get("purpose") != "download":
        raise ValueError("token purpose mismatch")
    if payload.get("project") != project_name:
        raise ValueError("token project mismatch")
    return payload


def _get_password_hash() -> str:
    global _cached_password_hash
    if _cached_password_hash is None:
        _cached_password_hash = hash_password(os.environ.get("AUTH_PASSWORD", ""))
    return _cached_password_hash


def check_credentials(username: str, password: str) -> bool:
    expected_username = os.environ.get("AUTH_USERNAME", "admin")
    pw_hash = _get_password_hash()
    username_ok = secrets.compare_digest(username, expected_username)
    password_ok = verify_password(password, pw_hash)
    return username_ok and password_ok


def ensure_auth_password(env_path: str | None = None) -> str:
    password = os.environ.get("AUTH_PASSWORD")
    if password:
        return password

    password = generate_password()
    os.environ["AUTH_PASSWORD"] = password

    env_file = Path(env_path) if env_path else PROJECT_ROOT / ".env"
    try:
        if env_file.exists():
            lines = env_file.read_text(encoding="utf-8").splitlines()
            new_lines: list[str] = []
            found = False
            for line in lines:
                if not found and line.strip().startswith("AUTH_PASSWORD="):
                    new_lines.append(f"AUTH_PASSWORD={password}")
                    found = True
                else:
                    new_lines.append(line)
            if not found:
                new_lines.append(f"AUTH_PASSWORD={password}")
            env_file.write_text("\n".join(new_lines) + "\n", encoding="utf-8")
        else:
            env_file.write_text(f"AUTH_PASSWORD={password}\n", encoding="utf-8")
    except OSError:
        logger.warning("Could not write AUTH_PASSWORD to %s", env_file)

    logger.warning("Generated bootstrap AUTH_PASSWORD. Check your .env file.")
    return password


async def ensure_bootstrap_admin() -> None:
    """Create or repair the bootstrap admin user from env configuration."""

    from lib.db import async_session_factory
    from lib.db.repositories.user_repository import UserRepository

    username = os.environ.get("AUTH_USERNAME", "admin").strip() or "admin"
    email = os.environ.get("AUTH_EMAIL", "").strip().lower() or f"{username}@storyforge.local"
    display_name = os.environ.get("AUTH_DISPLAY_NAME", "").strip() or "Storyforge Admin"
    password = ensure_auth_password()

    async with async_session_factory() as session:
        repo = UserRepository(session)
        user = await repo.get_by_username(username)
        if user is None:
            await repo.create(
                username=username,
                email=email,
                display_name=display_name,
                password_hash=hash_password(password),
                role="admin",
                is_active=True,
                is_email_verified=True,
            )
            await session.commit()
            logger.warning("Created bootstrap admin account '%s' (%s)", username, email)
            return

        password_hash = hash_password(password) if not user.password_hash else None
        await repo.set_bootstrap_fields(
            user,
            email=user.email or email,
            display_name=user.display_name or display_name,
            password_hash=password_hash,
        )
        await session.commit()


def _hash_api_key(key: str) -> str:
    return hashlib.sha256(key.encode("utf-8")).hexdigest()


_api_key_cache: OrderedDict[str, tuple[dict[str, Any] | None, float]] = OrderedDict()
_API_KEY_CACHE_MAX = 512


def invalidate_api_key_cache(key_hash: str) -> None:
    _api_key_cache.pop(key_hash, None)


def _get_cached_api_key_payload(key_hash: str) -> tuple[bool, dict[str, Any] | None]:
    entry = _api_key_cache.get(key_hash)
    if entry is None:
        return False, None
    payload, expiry = entry
    if time.monotonic() > expiry:
        _api_key_cache.pop(key_hash, None)
        return False, None
    _api_key_cache.move_to_end(key_hash)
    return True, payload


def _set_api_key_cache(key_hash: str, payload: dict[str, Any] | None, expires_at_ts: float | None = None) -> None:
    if len(_api_key_cache) >= _API_KEY_CACHE_MAX:
        _api_key_cache.popitem(last=False)
    ttl = API_KEY_CACHE_TTL
    if payload is not None and expires_at_ts is not None:
        remaining = expires_at_ts - time.monotonic()
        if remaining <= 0:
            _api_key_cache[key_hash] = (None, time.monotonic() + API_KEY_CACHE_TTL)
            return
        ttl = min(ttl, remaining)
    _api_key_cache[key_hash] = (payload, time.monotonic() + ttl)


async def _verify_api_key(token: str) -> dict[str, Any] | None:
    key_hash = _hash_api_key(token)

    hit, cached_payload = _get_cached_api_key_payload(key_hash)
    if hit:
        return cached_payload

    from lib.db import async_session_factory
    from lib.db.repositories.api_key_repository import ApiKeyRepository

    async with async_session_factory() as session:
        async with session.begin():
            row = await ApiKeyRepository(session).get_by_hash(key_hash)

    if row is None:
        _set_api_key_cache(key_hash, None)
        return None

    expires_at = row.get("expires_at")
    expires_at_monotonic: float | None = None
    if expires_at:
        try:
            exp_dt = expires_at
            if exp_dt.tzinfo is None:
                exp_dt = exp_dt.replace(tzinfo=UTC)
            if datetime.now(UTC) >= exp_dt:
                _set_api_key_cache(key_hash, None)
                return None
            expires_at_monotonic = time.monotonic() + max((exp_dt - datetime.now(UTC)).total_seconds(), 0)
        except (TypeError, ValueError):
            logger.warning("Could not parse API key expiry for key %s", row.get("name"))

    payload = {"sub": f"apikey:{row['name']}", "via": "apikey"}
    _set_api_key_cache(key_hash, payload, expires_at_ts=expires_at_monotonic)

    import asyncio

    async def _touch() -> None:
        try:
            async with async_session_factory() as session:
                async with session.begin():
                    await ApiKeyRepository(session).touch_last_used(key_hash)
        except Exception:
            logger.exception("Failed to update API key last_used_at")

    task = asyncio.create_task(_touch())
    task.add_done_callback(lambda _: None)
    return payload


def _verify_and_get_payload(token: str) -> dict[str, Any]:
    payload = verify_token(token)
    if payload is None:
        raise HTTPException(
            status_code=401,
            detail="token invalid or expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload


async def _verify_and_get_payload_async(token: str) -> dict[str, Any]:
    if token.startswith(API_KEY_PREFIX):
        payload = await _verify_api_key(token)
        if payload is None:
            raise HTTPException(
                status_code=401,
                detail="API key invalid or expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return payload
    return _verify_and_get_payload(token)


def _payload_to_user(payload: dict[str, Any]) -> CurrentUserInfo:
    username = str(payload.get("username") or payload.get("sub") or "")
    return CurrentUserInfo(
        id=str(payload.get("uid") or DEFAULT_USER_ID),
        sub=username,
        role=str(payload.get("role") or "admin"),
        username=username or None,
        email=payload.get("email"),
        display_name=payload.get("display_name") or username or None,
        is_email_verified=bool(payload.get("email_verified", True)),
    )


async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]) -> CurrentUserInfo:
    payload = await _verify_and_get_payload_async(token)
    return _payload_to_user(payload)


async def get_current_user_flexible(
    token: Annotated[str | None, Depends(oauth2_scheme_optional)] = None,
    query_token: str | None = Query(None, alias="token"),
) -> CurrentUserInfo:
    raw = token or query_token
    if not raw:
        raise HTTPException(
            status_code=401,
            detail="missing auth token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = await _verify_and_get_payload_async(raw)
    return _payload_to_user(payload)


CurrentUser = Annotated[CurrentUserInfo, Depends(get_current_user)]
CurrentUserFlexible = Annotated[CurrentUserInfo, Depends(get_current_user_flexible)]
