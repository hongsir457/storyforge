#!/usr/bin/env python3
"""
Revision chapter generator. Rewrites a chapter from a specific revision brief.
Usage: python gen_revision.py <chapter_num> <brief_file>
"""

import json
import os
import sys
import traceback
from datetime import datetime
from pathlib import Path

from anthropic_compat import generate_text
from dotenv import load_dotenv
from writing_language import get_writing_language, prose_output_requirement

BASE_DIR = Path(__file__).parent
load_dotenv(BASE_DIR / ".env")

WRITER_MODEL = os.environ.get("AUTONOVEL_WRITER_MODEL", "gemini-3.1-pro-preview")
API_BASE = os.environ.get("AUTONOVEL_API_BASE_URL", "https://generativelanguage.googleapis.com")
WRITING_LANGUAGE = get_writing_language()
CHAPTERS_DIR = BASE_DIR / "chapters"
EDIT_LOGS_DIR = BASE_DIR / "edit_logs"


def call_writer(prompt, max_tokens=16000):
    payload = {
        "model": WRITER_MODEL,
        "max_tokens": max_tokens,
        "temperature": 0.8,
        "system": (
            "You are rewriting a fantasy novel chapter based on a specific revision brief. "
            "You follow the brief exactly. You preserve the voice, world, and characters "
            "from the existing draft while making the structural changes specified. "
            "You write the FULL chapter. Do not truncate or summarize. "
            f"{prose_output_requirement('All revised chapter prose')}"
        ),
        "messages": [{"role": "user", "content": prompt}],
    }
    return generate_text(payload, timeout=600, base_url=API_BASE)


def write_revision_failure(ch_num: int, brief_file: str, exc: Exception) -> Path:
    EDIT_LOGS_DIR.mkdir(exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_path = EDIT_LOGS_DIR / f"{timestamp}_ch{ch_num:02d}_revision_failed.json"
    payload = {
        "chapter": ch_num,
        "brief_file": str(brief_file),
        "model": WRITER_MODEL,
        "api_base": API_BASE,
        "error": f"{type(exc).__name__}: {exc}",
        "chapter_preserved": True,
        "_debug_traceback": traceback.format_exc(),
    }
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return out_path


def main(argv: list[str] | None = None):
    args = sys.argv[1:] if argv is None else argv
    if len(args) < 2:
        raise SystemExit("Usage: python gen_revision.py <chapter_num> <brief_file>")

    ch_num = int(args[0])
    brief_file = args[1]

    voice = (BASE_DIR / "voice.md").read_text(encoding="utf-8")
    characters = (BASE_DIR / "characters.md").read_text(encoding="utf-8")
    world = (BASE_DIR / "world.md").read_text(encoding="utf-8")
    brief = Path(brief_file).read_text(encoding="utf-8")

    # Load adjacent chapters for continuity
    prev_path = CHAPTERS_DIR / f"ch_{ch_num - 1:02d}.md"
    next_path = CHAPTERS_DIR / f"ch_{ch_num + 1:02d}.md"
    prev_tail = prev_path.read_text(encoding="utf-8")[-2000:] if prev_path.exists() else "(first chapter)"
    next_head = next_path.read_text(encoding="utf-8")[:1500] if next_path.exists() else "(last chapter)"

    # Load old version if exists
    old_path = CHAPTERS_DIR / f"ch_{ch_num:02d}.md"
    old_text = old_path.read_text(encoding="utf-8") if old_path.exists() else "(no existing draft)"

    prompt = f"""Rewrite Chapter {ch_num} of this novel.

REVISION BRIEF (follow this exactly):
{brief}

VOICE DEFINITION:
{voice}

CHARACTER REGISTRY:
{characters}

WORLD BIBLE:
{world}

PREVIOUS CHAPTER ENDING (maintain continuity):
{prev_tail}

NEXT CHAPTER OPENING (end so this flows into it):
{next_head}

THE EXISTING DRAFT (use as raw material -- keep what works, cut what doesn't):
{old_text}

ANTI-PATTERN RULES:
- NO triadic sensory lists (X. Y. Z.)
- NO "He did not [verb]" more than once
- NO "He thought about [X]" constructions
- NO "the way [X] did [Y]" more than twice
- NO "not X, but Y" formula in narration
- NO over-explaining after showing
- MAX 2 section breaks
- At least one moment that genuinely surprises
- 70%+ in-scene (dialogue and action, not summary)
- Dialogue should sound like speech, not prose
- Write the revised chapter in {WRITING_LANGUAGE}.

Write the FULL revised chapter now."""

    print(f"Rewriting Chapter {ch_num}...", file=sys.stderr)
    try:
        result = call_writer(prompt)
    except Exception as exc:
        failure_path = write_revision_failure(ch_num, brief_file, exc)
        print(
            f"Revision model failed; preserved Chapter {ch_num}. Diagnostic: {failure_path}",
            file=sys.stderr,
        )
        print("REVISION_STATUS: skipped_model_failure")
        return

    out_path = CHAPTERS_DIR / f"ch_{ch_num:02d}.md"
    out_path.write_text(result, encoding="utf-8")
    print(f"Saved to {out_path}", file=sys.stderr)
    print(f"Word count: {len(result.split())}", file=sys.stderr)
    print("REVISION_STATUS: written")


if __name__ == "__main__":
    main()
