#!/usr/bin/env python3
"""
Rebuild outline.md from the actual chapters.
Reads each chapter, calls the LLM for a structured summary,
and assembles into an outline that reflects the novel as-written.
"""

import json
import os
import re
from pathlib import Path

from anthropic_compat import build_headers, messages_url
from dotenv import load_dotenv

BASE_DIR = Path(__file__).parent
load_dotenv(BASE_DIR / ".env")

JUDGE_MODEL = os.environ.get("AUTONOVEL_JUDGE_MODEL", "claude-sonnet-4-6")
API_BASE = os.environ.get("AUTONOVEL_API_BASE_URL", "https://api.anthropic.com")
CHAPTERS_DIR = BASE_DIR / "chapters"


def discover_chapter_files() -> list[Path]:
    return sorted(CHAPTERS_DIR.glob("ch_*.md"))


def call_model(prompt, max_tokens=1500):
    import httpx

    headers = build_headers(base_url=API_BASE)
    payload = {
        "model": JUDGE_MODEL,
        "max_tokens": max_tokens,
        "temperature": 0.1,
        "system": (
            "You produce structured outline entries for novel chapters. "
            "Be precise about what HAPPENS, what CHANGES, and what threads are planted/harvested. "
            "Output valid JSON only."
        ),
        "messages": [{"role": "user", "content": prompt}],
    }
    resp = httpx.post(messages_url(API_BASE), headers=headers, json=payload, timeout=120)
    resp.raise_for_status()
    text = resp.json()["content"][0]["text"]
    # Extract JSON from response
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```\w*\n?", "", text)
        text = re.sub(r"\n?```$", "", text)
    return json.loads(text)


def main():
    entries = []

    chapter_files = discover_chapter_files()
    if not chapter_files:
        raise SystemExit("ERROR: No chapter files found.")

    for path in chapter_files:
        ch = int(path.stem.removeprefix("ch_"))
        text = path.read_text()
        wc = len(text.split())

        title_line = text.strip().split("\n")[0].lstrip("# ").strip()

        prompt = f"""Analyze this chapter and produce a structured outline entry.

CHAPTER {ch}: "{title_line}" ({wc} words)

{text}

Return JSON with these fields:
- "title": the chapter title (string)
- "location": primary setting (string)
- "characters": list of characters who appear (list of strings)
- "summary": 2-3 sentence summary of what happens (string)
- "beats": list of 3-5 key story beats in order (list of strings)
- "try_fail": the try-fail cycle type: "yes-but", "no-and", "yes-and", or "no-but" (string)
- "plants": foreshadowing threads PLANTED in this chapter (list of strings)
- "harvests": foreshadowing threads PAID OFF in this chapter (list of strings)
- "emotional_arc": one sentence describing the emotional movement (string)
- "chapter_question": the question left open at chapter's end (string)

JSON only, no other text."""

        data = call_model(prompt)
        data["num"] = ch
        data["words"] = wc
        entries.append(data)
        print(f"  {ch:2d}. {title_line} ({wc}w)")

    # Build new outline
    lines = []
    lines.append("# THE SECOND SON OF THE HOUSE OF BELLS")
    lines.append("## Chapter Outline (reflects actual novel as-written)")
    lines.append("")
    lines.append(f"**{len(entries)} chapters, {sum(e['words'] for e in entries):,} words**")
    lines.append("")
    lines.append("---")
    lines.append("")

    for e in entries:
        lines.append(f"### Ch {e['num']}: {e['title']}")
        lines.append(f"**{e['words']} words** | **Location:** {e.get('location', 'N/A')}")
        lines.append(f"- **Characters:** {', '.join(e.get('characters', []))}")
        lines.append(f"- **Try-fail cycle:** {e.get('try_fail', 'N/A')}")
        lines.append(f"- **Emotional arc:** {e.get('emotional_arc', 'N/A')}")
        lines.append("")
        lines.append(f"**Summary:** {e.get('summary', 'N/A')}")
        lines.append("")
        lines.append("**Beats:**")
        for b in e.get("beats", []):
            lines.append(f"1. {b}")
        lines.append("")
        if e.get("plants"):
            lines.append("**Plants:**")
            for p in e["plants"]:
                lines.append(f"- {p}")
            lines.append("")
        if e.get("harvests"):
            lines.append("**Harvests:**")
            for h in e["harvests"]:
                lines.append(f"- {h}")
            lines.append("")
        lines.append(f"**Chapter question:** {e.get('chapter_question', 'N/A')}")
        lines.append("")
        lines.append("---")
        lines.append("")

    # Foreshadowing ledger
    lines.append("## FORESHADOWING LEDGER")
    lines.append("")
    lines.append("| Thread | Planted | Harvested |")
    lines.append("|--------|---------|-----------|")

    # Collect all plants and harvests
    all_plants = {}
    all_harvests = {}
    for e in entries:
        for p in e.get("plants", []):
            key = p[:60]
            if key not in all_plants:
                all_plants[key] = []
            all_plants[key].append(e["num"])
        for h in e.get("harvests", []):
            key = h[:60]
            if key not in all_harvests:
                all_harvests[key] = []
            all_harvests[key].append(e["num"])

    # Match plants to harvests by keyword overlap
    all_threads = set(list(all_plants.keys()) + list(all_harvests.keys()))
    for thread in sorted(all_threads):
        planted = ", ".join(f"Ch {n}" for n in all_plants.get(thread, []))
        harvested = ", ".join(f"Ch {n}" for n in all_harvests.get(thread, []))
        lines.append(f"| {thread} | {planted} | {harvested} |")

    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("*Outline rebuilt from actual chapters, Cycle 5.*")

    out = "\n".join(lines)
    (BASE_DIR / "outline.md").write_text(out)
    print(f"\nSaved outline.md ({len(out.split())} words)")


if __name__ == "__main__":
    main()
