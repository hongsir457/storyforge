#!/usr/bin/env python3
"""
One-shot characters.md generator for foundation phase.
Reads seed.txt + voice.md + world.md + CRAFT.md, calls writer model.
"""

import os
import sys
from pathlib import Path

from anthropic_compat import generate_text
from dotenv import load_dotenv

BASE_DIR = Path(__file__).parent
load_dotenv(BASE_DIR / ".env")
OUTPUT_PATH = BASE_DIR / "characters.md"

WRITER_MODEL = os.environ.get("AUTONOVEL_WRITER_MODEL", "gemini-3.1-pro-preview")
API_BASE = os.environ.get("AUTONOVEL_API_BASE_URL", "https://generativelanguage.googleapis.com")


def call_writer(prompt, max_tokens=16000):
    payload = {
        "model": WRITER_MODEL,
        "max_tokens": max_tokens,
        "temperature": 0.7,
        "system": (
            "You are a character designer for literary fiction with deep knowledge of "
            "wound/want/need/lie frameworks, Sanderson's three sliders, and dialogue "
            "distinctiveness. You create characters who feel like real people with "
            "contradictions, secrets, and speech patterns you can hear. "
            "You never use AI slop words. You write in clean, direct prose."
        ),
        "messages": [{"role": "user", "content": prompt}],
    }
    return generate_text(payload, timeout=300, base_url=API_BASE)


seed = (BASE_DIR / "seed.txt").read_text()
world = (BASE_DIR / "world.md").read_text()

# Voice Part 2 only
voice = (BASE_DIR / "voice.md").read_text()
voice_lines = voice.split("\n")
part2_start = next(i for i, line in enumerate(voice_lines) if "Part 2" in line)
voice_part2 = "\n".join(voice_lines[part2_start:])

prompt = f"""Build a complete CHARACTERS.MD file for this novel.

This document is the definitive reference for WHO exists in the story, what drives them,
how they speak, what they hide, and how they collide with one another.

SEED CONCEPT:
{seed}

WORLD BIBLE (the world these characters inhabit):
{world}

VOICE IDENTITY (the novel's tone):
{voice_part2}

CHARACTER CRAFT REQUIREMENTS (from CRAFT.md):

### The Three Sliders (Sanderson)
Every character has three independent dials (0-10):
  PROACTIVITY -- Do they drive the plot or react to it?
  LIKABILITY  -- Does the reader empathize with them?
  COMPETENCE  -- Are they good at what they do?
Rule: compelling = HIGH on at least TWO, or HIGH on one with clear growth.

### Wound / Want / Need / Lie Framework
A causal chain:
  GHOST (backstory event) -> WOUND (ongoing damage) -> LIE (false belief to cope)
    -> WANT (external goal driven by Lie) -> NEED (internal truth, opposes Lie)
Rules: Want and Need must be IN TENSION. Lie statable in one sentence.
  Truth is its direct opposite.

### Dialogue Distinctiveness (8 dimensions)
1. Vocabulary level  2. Sentence length  3. Contractions/formality
4. Verbal tics  5. Question vs statement ratio  6. Interruption patterns
7. Metaphor domain  8. Directness vs indirectness
Test: Remove dialogue tags. Can you tell who's speaking?

BUILD THE REGISTRY AROUND THE STORY'S ACTUAL CAST:

- Identify the protagonist or protagonist group implied by the seed.
- Identify the primary antagonist or opposing force.
- Identify key allies, rivals, mentors, family/intimate ties, institutional forces,
  and wildcard characters the plot will need.
- Create at least 6 significant characters unless the seed clearly demands a smaller cast.
- If a character is absent for long stretches but crucial to the plot, still give them full depth.

FOR EACH CHARACTER INCLUDE:
- Name, age, role
- Ghost/Wound/Want/Need/Lie chain (for major characters)
- Three sliders (proactivity/likability/competence) with numbers and justification
- Arc type and arc trajectory
- Speech pattern (all 8 dimensions, with example lines)
- Physical appearance (specific, not generic)
- Physical habits and unconscious tells
- Secrets (what the reader doesn't learn immediately)
- Key relationships (mapped to other characters)
- Thematic role (what question does this character embody?)

IMPORTANT:
- Characters must INTERCONNECT. Their wants should conflict with each other.
- Every secret should be something that would CHANGE the story if revealed.
- Speech patterns must be distinct enough to pass the no-tags test.
- Give major characters bodily habits, unconscious tells, and private contradictions.
- If the seed implies a special ability, burden, injury, duty, or inheritance, tie it to habits and speech.
- Antagonists must be as fully realized as protagonists -- understandable, not cardboard.
- Target ~3000-4000 words. Dense character work, not padding.
"""

print("Calling writer model...", file=sys.stderr)
result = call_writer(prompt)
OUTPUT_PATH.write_text(result, encoding="utf-8")
print(f"Saved to {OUTPUT_PATH}", file=sys.stderr)
print(result)
