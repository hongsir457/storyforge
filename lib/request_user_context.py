"""Per-request authenticated user context shared across backend layers."""

from __future__ import annotations

from contextvars import ContextVar
from typing import Any

_current_request_user: ContextVar[Any | None] = ContextVar("current_request_user", default=None)


def set_current_request_user(user: Any | None) -> None:
    _current_request_user.set(user)


def get_current_request_user() -> Any | None:
    return _current_request_user.get()
