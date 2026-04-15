#!/usr/bin/env python3
"""
Build a condensed arc summary for full-novel evaluation.
For each chapter: first 150 words, last 150 words, plus any dialogue.
Gives the reader panel enough to evaluate the ARC without 72k tokens.
"""

import os
import re
from pathlib import Path

from anthropic_compat import build_headers, messages_url
from dotenv import load_dotenv

BASE_DIR = Path(__file__).parent
load_dotenv(BASE_DIR / ".env")

WRITER_MODEL = os.environ.get("AUTONOVEL_WRITER_MODEL", "claude-sonnet-4-6")
API_BASE = os.environ.get("AUTONOVEL_API_BASE_URL", "https://api.anthropic.com")
CHAPTERS_DIR = BASE_DIR / "chapters"


def discover_chapter_files() -> list[Path]:
    return sorted(CHAPTERS_DIR.glob("ch_*.md"))


def call_writer(prompt, max_tokens=4000):
    import httpx

    headers = build_headers(base_url=API_BASE)
    payload = {
        "model": WRITER_MODEL,
        "max_tokens": max_tokens,
        "temperature": 0.1,
        "system": "You summarize novel chapters precisely. State what HAPPENS, what CHANGES, and what QUESTIONS are left open. No evaluation. No praise. Just events and shifts.",
        "messages": [{"role": "user", "content": prompt}],
    }
    resp = httpx.post(messages_url(API_BASE), headers=headers, json=payload, timeout=120)
    resp.raise_for_status()
    return resp.json()["content"][0]["text"]


def extract_key_passages(text):
    """Get opening, closing, and best dialogue from a chapter."""
    words = text.split()
    opening = " ".join(words[:150])
    closing = " ".join(words[-150:])

    # Extract dialogue lines
    dialogue = re.findall(r'["""]([^"""]{20,})["""]', text)
    # Pick up to 3 longest dialogue lines
    dialogue.sort(key=len, reverse=True)
    top_dialogue = dialogue[:3]

    return opening, closing, top_dialogue


def main():
    summaries = []
    chapter_files = discover_chapter_files()
    if not chapter_files:
        raise SystemExit("ERROR: No chapter files found.")
    seed_excerpt = (BASE_DIR / "seed.txt").read_text(encoding="utf-8").strip()
    seed_excerpt = " ".join(seed_excerpt.split())[:1200]

    for path in chapter_files:
        ch = int(path.stem.removeprefix("ch_"))
        text = path.read_text()
        wc = len(text.split())
        opening, closing, dialogue = extract_key_passages(text)

        # Get a 100-word summary from the model
        summary = call_writer(
            f"Summarize this chapter in exactly 3 sentences. What happens, what changes, what question is left open.\n\nCHAPTER {ch}:\n{text}",
            max_tokens=200,
        )

        entry = f"""### Chapter {ch} ({wc} words)
**Summary:** {summary}

**Opening:** {opening}...

**Closing:** ...{closing}

**Key dialogue:**
"""
        for d in dialogue:
            entry += f'> "{d}"\n\n'

        summaries.append(entry)
        print(f"Ch {ch}: summarized ({wc}w)")

    # Calculate total word count
    total_wc = sum(len(path.read_text().split()) for path in chapter_files)
    chapter_count = len(chapter_files)

    # Assemble
    full = f"""# ARC SUMMARY
## Full-Arc Summary for Reader Panel

This document contains chapter summaries, opening/closing passages,
and key dialogue for all {chapter_count} chapters. Total novel: {total_wc:,} words.

SEED / PREMISE:
{seed_excerpt}

---

"""
    full += "\n---\n\n".join(summaries)

    out_path = BASE_DIR / "arc_summary.md"
    out_path.write_text(full)
    print(f"\nSaved to {out_path} ({len(full.split())} words)")


if __name__ == "__main__":
    main()
