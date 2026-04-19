#!/usr/bin/env python3
"""
Generate canon.md by extracting all hard facts from world.md + characters.md.
"""

import os
import sys
from pathlib import Path

from anthropic_compat import generate_text
from dotenv import load_dotenv
from writing_language import get_writing_language, prose_output_requirement

BASE_DIR = Path(__file__).parent
load_dotenv(BASE_DIR / ".env")
OUTPUT_PATH = BASE_DIR / "canon.md"

WRITER_MODEL = os.environ.get("AUTONOVEL_WRITER_MODEL", "gemini-3.1-pro-preview")
API_BASE = os.environ.get("AUTONOVEL_API_BASE_URL", "https://generativelanguage.googleapis.com")
WRITING_LANGUAGE = get_writing_language()


def call_writer(prompt, max_tokens=16000):
    payload = {
        "model": WRITER_MODEL,
        "max_tokens": max_tokens,
        "temperature": 0.2,  # Low temp for factual extraction
        "system": (
            "You are a continuity editor extracting hard facts from fantasy novel "
            "planning documents. You are precise, exhaustive, and never invent facts "
            "that aren't in the source material. Every entry must be traceable to a "
            "specific statement in the source documents. "
            f"{prose_output_requirement()}"
        ),
        "messages": [{"role": "user", "content": prompt}],
    }
    return generate_text(payload, timeout=300, base_url=API_BASE)


world = (BASE_DIR / "world.md").read_text()
characters = (BASE_DIR / "characters.md").read_text()
seed = (BASE_DIR / "seed.txt").read_text()

prompt = f"""Extract EVERY hard fact from these planning documents into a structured canon database.
A "hard fact" is anything a writer must not contradict: names, ages, dates, physical descriptions,
rules of the magic system, geography, relationships, established events.

SOURCE DOCUMENTS:

=== SEED.TXT ===
{seed}

=== WORLD.MD ===
{world}

=== CHARACTERS.MD ===
{characters}

FORMAT THE OUTPUT AS CANON.MD with these categories:

## Geography
- Specific facts about locations, distances, physical properties

## Timeline
- Dated events, ages, durations

## Magic System Rules
- Hard rules of the world's power systems / technology / institutions
- Special abilities, exceptions, costs, and limitations

## Character Facts
- Ages, physical descriptions, habits, relationships
- One entry per fact (not paragraphs)

## Political / Factional
- Who controls what, alliances, conflicts, contracts

## Cultural
- Customs, taboos, laws, festivals, food, clothing

## Established In-Story
- Events that have already happened in the story's past
- Prior deals, betrayals, wars, deaths, inheritances, revelations, and binding events

RULES:
- One fact per bullet point. Short. Specific. Checkable.
- Include the source (world.md or characters.md) in parentheses after each fact.
- Aim for 80-120 entries minimum. Be exhaustive.
- If two documents give slightly different details, note the discrepancy.
- DO NOT invent facts. Only record what's explicitly stated.
- Write the canon database in {WRITING_LANGUAGE}.
"""

print("Calling writer model...", file=sys.stderr)
result = call_writer(prompt)
OUTPUT_PATH.write_text(result, encoding="utf-8")
print(f"Saved to {OUTPUT_PATH}", file=sys.stderr)
print(result)
