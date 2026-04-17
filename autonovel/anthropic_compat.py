from __future__ import annotations

import os
from urllib.parse import quote

DEFAULT_API_BASE_URL = "https://generativelanguage.googleapis.com"
DEFAULT_API_VERSION = "v1beta"


def get_api_key() -> str:
    return (os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY") or "").strip()


def get_api_base_url() -> str:
    return (
        (os.environ.get("AUTONOVEL_API_BASE_URL") or os.environ.get("GEMINI_BASE_URL") or DEFAULT_API_BASE_URL)
        .strip()
        .rstrip("/")
    )


def has_auth_config() -> bool:
    return bool(get_api_key())


def auth_error_message() -> str:
    return "Set GEMINI_API_KEY in .env first"


def build_headers(*, beta: str | None = None, base_url: str | None = None) -> dict[str, str]:
    headers = {"content-type": "application/json"}
    api_key = get_api_key()
    if api_key:
        headers["x-goog-api-key"] = api_key
    return headers


def messages_url(base_url: str | None = None, *, model: str | None = None) -> str:
    normalized = (base_url or get_api_base_url()).strip().rstrip("/")
    if normalized.endswith("/v1") or normalized.endswith("/v1beta"):
        prefix = normalized
    else:
        prefix = f"{normalized}/{DEFAULT_API_VERSION}"
    model_name = quote((model or "").strip() or "gemini-3.1-pro-preview", safe="")
    return f"{prefix}/models/{model_name}:generateContent"


def _parts_from_text(text: str) -> list[dict[str, str]]:
    return [{"text": text}]


def _extract_prompt_text(messages: list[dict]) -> list[dict[str, object]]:
    contents: list[dict[str, object]] = []
    for message in messages:
        role = str(message.get("role") or "user").strip().lower() or "user"
        api_role = "model" if role == "assistant" else "user"
        content = message.get("content", "")
        if isinstance(content, list):
            text = "".join(
                str(block.get("text", ""))
                for block in content
                if isinstance(block, dict) and str(block.get("type", "text")) == "text"
            )
        else:
            text = str(content)
        contents.append({"role": api_role, "parts": _parts_from_text(text)})
    return contents


def _to_gemini_payload(payload: dict) -> tuple[str, dict]:
    model = str(payload.get("model") or "").strip() or "gemini-3.1-pro-preview"
    body: dict[str, object] = {
        "contents": _extract_prompt_text(list(payload.get("messages") or [])),
    }

    system_instruction = str(payload.get("system") or "").strip()
    if system_instruction:
        body["system_instruction"] = {"parts": _parts_from_text(system_instruction)}

    generation_config: dict[str, object] = {}
    max_tokens = payload.get("max_tokens")
    if max_tokens is not None:
        generation_config["maxOutputTokens"] = int(max_tokens)

    temperature = payload.get("temperature")
    if temperature is not None:
        generation_config["temperature"] = float(temperature)

    if generation_config:
        body["generationConfig"] = generation_config

    return model, body


def _extract_text(data: dict) -> str:
    parts: list[str] = []
    for candidate in data.get("candidates") or []:
        content = candidate.get("content") or {}
        for part in content.get("parts") or []:
            text = part.get("text")
            if text:
                parts.append(str(text))
    return "".join(parts).strip()


def generate_text(payload: dict, *, timeout: int, base_url: str | None = None) -> str:
    import httpx

    model, body = _to_gemini_payload(payload)
    response = httpx.post(
        messages_url(base_url, model=model),
        headers=build_headers(base_url=base_url),
        json=body,
        timeout=timeout,
    )
    response.raise_for_status()
    return _extract_text(response.json())
