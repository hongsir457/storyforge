from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).parent
load_dotenv(BASE_DIR / ".env")

DEFAULT_WRITING_LANGUAGE = "简体中文"


def get_writing_language() -> str:
    value = (os.environ.get("AUTONOVEL_WRITING_LANGUAGE") or DEFAULT_WRITING_LANGUAGE).strip()
    return value or DEFAULT_WRITING_LANGUAGE


def prose_output_requirement(scope: str = "All natural-language output") -> str:
    return f"{scope} must be written in {get_writing_language()}."


def json_output_requirement() -> str:
    return (
        "Return valid JSON only. Keep the JSON keys exactly as requested, "
        f"but write every natural-language string value in {get_writing_language()}."
    )
