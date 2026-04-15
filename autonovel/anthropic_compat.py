from __future__ import annotations

import os

DEFAULT_API_BASE_URL = "https://api.anthropic.com"
OPENROUTER_ANTHROPIC_BASE_URL = "https://openrouter.ai/api"
ANTHROPIC_VERSION = "2023-06-01"


def get_api_key() -> str:
    return os.environ.get("ANTHROPIC_API_KEY", "").strip()


def get_auth_token() -> str:
    return os.environ.get("ANTHROPIC_AUTH_TOKEN", "").strip()


def get_api_base_url() -> str:
    return (os.environ.get("AUTONOVEL_API_BASE_URL") or DEFAULT_API_BASE_URL).strip().rstrip("/")


def is_openrouter_base_url(base_url: str | None = None) -> bool:
    normalized = (base_url or get_api_base_url()).strip().lower().rstrip("/")
    return normalized.startswith("https://openrouter.ai/api")


def resolve_auth_value() -> str:
    auth_token = get_auth_token()
    if auth_token:
        return auth_token
    return get_api_key()


def has_auth_config() -> bool:
    return bool(resolve_auth_value())


def auth_error_message() -> str:
    return "Set ANTHROPIC_API_KEY or ANTHROPIC_AUTH_TOKEN in .env first"


def build_headers(*, beta: str | None = None, base_url: str | None = None) -> dict[str, str]:
    headers = {
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
    }
    if beta:
        headers["anthropic-beta"] = beta

    api_key = get_api_key()
    auth_token = get_auth_token()
    use_bearer = is_openrouter_base_url(base_url)

    auth_value = ""
    if use_bearer:
        auth_value = auth_token or api_key
    else:
        auth_value = api_key or auth_token

    if not auth_value:
        return headers

    if use_bearer or (auth_token and not api_key):
        headers["authorization"] = f"Bearer {auth_value}"
    else:
        headers["x-api-key"] = auth_value
    return headers


def messages_url(base_url: str | None = None) -> str:
    normalized = (base_url or get_api_base_url()).strip().rstrip("/")
    if normalized.endswith("/v1"):
        return f"{normalized}/messages"
    return f"{normalized}/v1/messages"
