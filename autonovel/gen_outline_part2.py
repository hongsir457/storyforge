#!/usr/bin/env python3
"""Continue outline.md if the first pass was truncated."""

import os
import re
import sys
from pathlib import Path

from anthropic_compat import build_headers, messages_url
from dotenv import load_dotenv

BASE_DIR = Path(__file__).parent
load_dotenv(BASE_DIR / ".env")
OUTLINE_PATH = BASE_DIR / "outline.md"

WRITER_MODEL = os.environ.get("AUTONOVEL_WRITER_MODEL", "claude-sonnet-4-6")
API_BASE = os.environ.get("AUTONOVEL_API_BASE_URL", "https://api.anthropic.com")


def call_writer(prompt, max_tokens=16000):
    import httpx

    headers = build_headers()
    payload = {
        "model": WRITER_MODEL,
        "max_tokens": max_tokens,
        "temperature": 0.5,
        "system": (
            "You are a novel architect continuing an outline. Continue in the exact same "
            "format as the material you are given. Do not restart from chapter 1. "
            "Fill in the missing chapters, then finish the foreshadowing ledger."
        ),
        "messages": [{"role": "user", "content": prompt}],
    }
    resp = httpx.post(messages_url(API_BASE), headers=headers, json=payload, timeout=600)
    resp.raise_for_status()
    return resp.json()["content"][0]["text"]


if not OUTLINE_PATH.exists():
    raise SystemExit(f"ERROR: Missing outline file: {OUTLINE_PATH}")

part1 = OUTLINE_PATH.read_text(encoding="utf-8")
mystery = (BASE_DIR / "MYSTERY.md").read_text(encoding="utf-8")
chapter_count = len(re.findall(r"^###\s*Ch(?:apter)?\s+\d+", part1, re.MULTILINE))

if "## Foreshadowing Ledger" in part1 and chapter_count >= 22:
    print("outline.md already appears complete; skipping continuation.", file=sys.stderr)
    sys.exit(0)

prompt = f"""The chapter outline below appears incomplete or truncated.
Continue from where it stops. Do not rewrite or summarize the material that already exists.

OUTLINE SO FAR:
{part1}

CENTRAL MYSTERY / DRAMATIC QUESTION (for reference):
{mystery}

YOUR TASK:
1. Continue from the last completed line or chapter.
2. Finish the remaining chapters needed for a complete, coherent novel arc.
3. Preserve the exact formatting conventions already in use.
4. After the final chapter, write the full Foreshadowing Ledger table.

REQUIREMENTS:
- Keep chapter numbering continuous.
- Do not duplicate chapters that already exist.
- Respect the story logic, world rules, and character dynamics already established.
- Make sure the back half escalates pressure, deepens consequences, and lands the climax.
- The ending must feel earned but does not need to resolve every wound cleanly.
- The Foreshadowing Ledger must include at least 15 threads with plant-to-payoff
  distance of at least 3 chapters whenever possible.
"""

print("Calling writer model...", file=sys.stderr)
result = call_writer(prompt)
combined = part1.rstrip() + "\n\n" + result.strip() + "\n"
OUTLINE_PATH.write_text(combined, encoding="utf-8")
print(f"Saved to {OUTLINE_PATH}", file=sys.stderr)
print(result)
