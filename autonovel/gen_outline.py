#!/usr/bin/env python3
"""Generate outline.md from seed + world + characters + mystery + craft."""

import os
import sys
from pathlib import Path

from anthropic_compat import generate_text
from dotenv import load_dotenv

BASE_DIR = Path(__file__).parent
load_dotenv(BASE_DIR / ".env")
OUTPUT_PATH = BASE_DIR / "outline.md"

WRITER_MODEL = os.environ.get("AUTONOVEL_WRITER_MODEL", "gemini-3.1-pro-preview")
API_BASE = os.environ.get("AUTONOVEL_API_BASE_URL", "https://generativelanguage.googleapis.com")


def call_writer(prompt, max_tokens=16000):
    payload = {
        "model": WRITER_MODEL,
        "max_tokens": max_tokens,
        "temperature": 0.5,
        "system": (
            "You are a novel architect with deep knowledge of Save the Cat beats, "
            "Sanderson's plotting principles, Dan Harmon's Story Circle, and MICE Quotient. "
            "You build outlines that an author can draft from without inventing structure "
            "on the fly. Every chapter has beats, emotional arc, and try-fail cycle type. "
            "You never use AI slop words. You write in clean, direct prose."
        ),
        "messages": [{"role": "user", "content": prompt}],
    }
    return generate_text(payload, timeout=600, base_url=API_BASE)


seed = (BASE_DIR / "seed.txt").read_text()
world = (BASE_DIR / "world.md").read_text()
characters = (BASE_DIR / "characters.md").read_text()
mystery = (BASE_DIR / "MYSTERY.md").read_text()
craft = (BASE_DIR / "CRAFT.md").read_text()

# Voice Part 2 only
voice = (BASE_DIR / "voice.md").read_text()
voice_lines = voice.split("\n")
part2_start = next(i for i, line in enumerate(voice_lines) if "Part 2" in line)
voice_part2 = "\n".join(voice_lines[part2_start:])

prompt = f"""Build a complete chapter outline for this novel. Target: 22-26 chapters,
~80,000 words total (~3,000-4,000 words per chapter), unless the seed clearly implies
a meaningfully shorter or longer structure.

SEED CONCEPT:
{seed}

THE CENTRAL MYSTERY / DRAMATIC QUESTION (author-facing; reader may discover gradually):
{mystery}

WORLD BIBLE:
{world}

CHARACTER REGISTRY:
{characters}

VOICE (tone and register):
{voice_part2}

CRAFT REFERENCE (structures to follow):
{craft}

BUILD THE OUTLINE WITH:

## Act Structure
Map out Act I (0-23%), Act II Part 1 (23-50%), Act II Part 2 (50-77%), Act III (77-100%).
State the percentage marks for the key turns in the novel.

## Chapter-by-Chapter Outline

For EACH chapter, provide:
### Ch N: [Title]
- **POV:** Which character perspective carries this chapter
- **Location:** Which districts/locations
- **Save the Cat beat:** Which beat this chapter serves (Opening Image, Setup, Catalyst, etc.)
- **% mark:** Where this falls in the novel
- **Emotional arc:** Starting emotion -> ending emotion
- **Try-fail cycle:** Yes-but / No-and / No-but / Yes-and
- **Beats:** 3-5 specific scene beats that must happen
- **Plants:** Foreshadowing elements planted in this chapter
- **Payoffs:** Foreshadowing elements that pay off here
- **Character movement:** What changes for the focal character(s) by chapter's end
- **False belief / pressure point:** Which belief, fear, obligation, blind spot, or
  emotional pressure is reinforced or challenged in this chapter
- **~Word count target:** for pacing

## Foreshadowing Ledger

A table tracking every planted thread:
| Thread | Planted (Ch) | Reinforced (Ch) | Payoff (Ch) | Type |

Include at LEAST 15 threads. Types: object, dialogue, action, symbolic, structural.

KEY PLOT ARCHITECTURE:

- Act I should establish the protagonist's ordinary world, the story's core pressure,
  and the destabilizing event that forces motion.
- Act II Part 1 should deepen investigation / pursuit / adaptation and complicate alliances.
- Midpoint should materially change the protagonist's understanding or leverage.
- Act II Part 2 should escalate consequences, tighten external pressure, and attack the
  protagonist's core false belief or coping strategy.
- All Is Lost / Dark Night should force a reframing, not just another obstacle.
- Act III must resolve the central dramatic question using rules and tensions already established.
- The resolution should show aftermath, cost, and what has actually changed.

CONSTRAINTS:
- The climax must be mechanically resolvable using established world rules, abilities,
  institutions, and constraints
- The plot engine should emerge from the seed's actual genre promise: mystery, romance,
  political struggle, cultivation ascent, survival, family drama, etc.
- The Stability Trap: bad things must stay bad. Not everything resolves cleanly.
- At least 3 chapters should be "quiet" -- character-focused, low-action, emotionally rich
- Vary the try-fail types: 60%+ should be "yes-but" or "no-and"
- The foreshadowing ledger must have plant-to-payoff distances of at least 3 chapters
"""

print("Calling writer model...", file=sys.stderr)
result = call_writer(prompt)
OUTPUT_PATH.write_text(result, encoding="utf-8")
print(f"Saved to {OUTPUT_PATH}", file=sys.stderr)
print(result)
