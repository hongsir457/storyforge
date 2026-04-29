#!/usr/bin/env python3
"""
Build a condensed arc summary for full-novel evaluation.
For each chapter: first 150 words, last 150 words, plus any dialogue.
Gives the reader panel enough to evaluate the ARC without 72k tokens.
"""

import os
import re
from pathlib import Path

from anthropic_compat import generate_text
from dotenv import load_dotenv
from writing_language import get_writing_language, prose_output_requirement

BASE_DIR = Path(__file__).parent
load_dotenv(BASE_DIR / ".env")

WRITER_MODEL = os.environ.get("AUTONOVEL_WRITER_MODEL", "gemini-3.1-pro-preview")
API_BASE = os.environ.get("AUTONOVEL_API_BASE_URL", "https://generativelanguage.googleapis.com")
CHAPTERS_DIR = BASE_DIR / "chapters"
WRITING_LANGUAGE = get_writing_language()


def discover_chapter_files() -> list[Path]:
    return sorted(CHAPTERS_DIR.glob("ch_*.md"))


def call_writer(prompt, max_tokens=4000):
    payload = {
        "model": WRITER_MODEL,
        "max_tokens": max_tokens,
        "temperature": 0.1,
        "system": (
            "You summarize novel chapters precisely. State what HAPPENS, what CHANGES, "
            "and what QUESTIONS are left open. No evaluation. No praise. Just events and shifts. "
            f"{prose_output_requirement()}"
        ),
        "messages": [{"role": "user", "content": prompt}],
    }
    return generate_text(payload, timeout=120, base_url=API_BASE)


def _truncate_words(text: str, limit: int) -> str:
    words = text.split()
    return " ".join(words[:limit])


def fallback_summary(chapter_num: int, title: str, opening: str, closing: str, dialogue: list[str]) -> str:
    summary_parts = [
        f'Chapter {chapter_num}, "{title}", opens with {opening[:220] or "an unresolved situation"}.',
        f"It closes on {closing[:220] or 'a new unanswered turn'}.",
    ]
    if dialogue:
        summary_parts.append(f'Key dialogue centers on "{dialogue[0][:180]}".')
    else:
        summary_parts.append("The chapter's movement is preserved here through opening and closing excerpts.")
    return " ".join(summary_parts)


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
    fallback_chapters: list[int] = []
    fallback_errors: list[str] = []
    seed_path = BASE_DIR / "seed.txt"
    seed_excerpt = seed_path.read_text(encoding="utf-8").strip() if seed_path.exists() else ""
    seed_excerpt = " ".join(seed_excerpt.split())[:1200]

    for path in chapter_files:
        ch = int(path.stem.removeprefix("ch_"))
        text = path.read_text(encoding="utf-8")
        wc = len(text.split())
        opening, closing, dialogue = extract_key_passages(text)
        title = text.strip().splitlines()[0].lstrip("# ").strip() if text.strip() else f"Chapter {ch}"
        opening_excerpt = opening or _truncate_words(text, 80) or title
        closing_excerpt = closing or _truncate_words(text, 80) or title

        try:
            summary = call_writer(
                f"Summarize this chapter in exactly 3 sentences in {WRITING_LANGUAGE}. "
                f"What happens, what changes, what question is left open.\n\nCHAPTER {ch}:\n{text}",
                max_tokens=200,
            )
        except Exception as exc:
            summary = fallback_summary(ch, title, opening_excerpt, closing_excerpt, dialogue)
            fallback_chapters.append(ch)
            fallback_errors.append(f"Chapter {ch}: {exc}")
            print(f"Ch {ch}: fallback summary ({exc})")

        entry = f"""### Chapter {ch} ({wc} words)
**Summary:** {summary}

**Opening:** {opening_excerpt}...

**Closing:** ...{closing_excerpt}

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
    if fallback_chapters:
        full += (
            "NOTE: Deterministic fallback summaries were used for "
            + ", ".join(f"Chapter {chapter}" for chapter in fallback_chapters)
            + " because model summarization failed.\n\n---\n\n"
        )
    full += "\n---\n\n".join(summaries)

    out_path = BASE_DIR / "arc_summary.md"
    out_path.write_text(full, encoding="utf-8")
    print(f"\nSaved to {out_path} ({len(full.split())} words)")
    if fallback_errors:
        for error in fallback_errors:
            print(f"  WARN: {error}")


if __name__ == "__main__":
    main()
