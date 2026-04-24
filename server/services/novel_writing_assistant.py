from __future__ import annotations

import textwrap
from typing import Any, Literal
from urllib.parse import quote

import httpx

NovelAssistantStage = Literal["seed", "style", "world", "characters", "plot", "outline"]


class NovelWritingAssistantError(RuntimeError):
    pass


STAGE_LABELS: dict[str, str] = {
    "seed": "Seed / core premise",
    "style": "Writing style",
    "world": "Worldbuilding",
    "characters": "Characters",
    "plot": "Plot direction",
    "outline": "Chapter outline",
}

STAGE_INSTRUCTIONS: dict[str, str] = {
    "seed": (
        "Turn the user's rough idea into a concise, opinionated novel seed. "
        "Clarify protagonist, genre promise, central pressure, stakes, and the question the novel must answer."
    ),
    "style": (
        "Define the writing style contract: genre tone, POV/tense, narrative distance, sentence rhythm, imagery wells, "
        "dialogue rules, pacing, and specific patterns to avoid."
    ),
    "world": (
        "Build a usable world bible: rules, institutions, social order, constraints, locations, conflicts, costs, "
        "and details that can generate scenes instead of abstract lore."
    ),
    "characters": (
        "Build the core character system: protagonist, opposition, allies, family/romance/mentor dynamics, "
        "desires, fears, secrets, contradictions, arcs, and relationship pressure."
    ),
    "plot": (
        "Shape the plot direction: act structure, escalation path, midpoint reversal, all-is-lost pressure, "
        "climax mechanism, aftermath, and unresolved costs."
    ),
    "outline": (
        "Draft a chapter-by-chapter outline. Choose a chapter count that fits the user's intent, not a fixed template. "
        "For each chapter include title, POV, major beats, emotional movement, plants/payoffs, and target word count."
    ),
}


def _messages_url(base_url: str, model: str) -> str:
    normalized = base_url.strip().rstrip("/") or "https://generativelanguage.googleapis.com"
    if normalized.endswith("/v1") or normalized.endswith("/v1beta"):
        prefix = normalized
    else:
        prefix = f"{normalized}/v1beta"
    return f"{prefix}/models/{quote(model, safe='')}:generateContent"


def _extract_text(data: dict[str, Any]) -> str:
    parts: list[str] = []
    for candidate in data.get("candidates") or []:
        content = candidate.get("content") or {}
        for part in content.get("parts") or []:
            text = part.get("text")
            if text:
                parts.append(str(text))
    return "".join(parts).strip()


def _context_from_brief(brief: dict[str, str]) -> str:
    chunks: list[str] = []
    for stage, label in STAGE_LABELS.items():
        value = str(brief.get(stage) or "").strip()
        if value:
            chunks.append(f"## {label}\n{value}")
    return "\n\n".join(chunks) or "(No confirmed or drafted brief sections yet.)"


def build_assistant_prompt(
    *,
    stage: NovelAssistantStage,
    title: str,
    writing_language: str,
    instruction: str,
    brief: dict[str, str],
) -> tuple[str, str]:
    stage_label = STAGE_LABELS[stage]
    stage_instruction = STAGE_INSTRUCTIONS[stage]
    existing_context = _context_from_brief(brief)

    system = (
        "You are a senior novel development editor and writing partner. "
        "Your job is to help the user make deliberate creative decisions before an automated drafting pipeline runs. "
        "Be concrete, story-useful, and selective. Do not flatter. Do not write generic advice. "
        f"Write all natural-language output in {writing_language}."
    )
    user_prompt = f"""
Develop the next confirmed planning section for a novel.

Novel title:
{title or "(not set yet)"}

Current stage:
{stage_label}

Stage objective:
{stage_instruction}

User direction for this pass:
{instruction or "(Use the existing brief and make the strongest next draft.)"}

Existing creative brief:
{existing_context}

Return Markdown with exactly these headings:

## Draft
Write the proposed content for the {stage_label} section. It must be directly usable inside seed.txt.

## Decisions To Confirm
List 3-6 concrete choices the user should confirm or correct before moving on.

Constraints:
- Respect anything already present in the existing creative brief unless the user's direction explicitly changes it.
- Prefer specific names, tensions, rules, scenes, and tradeoffs over broad labels.
- If the stage is outline, include a chapter count and per-chapter target word counts.
- Keep the response compact enough to edit in a workbench panel.
""".strip()
    return system, textwrap.dedent(user_prompt)


async def generate_novel_assistant_draft(
    *,
    runtime_env: dict[str, str],
    stage: NovelAssistantStage,
    title: str,
    writing_language: str,
    instruction: str,
    brief: dict[str, str],
) -> str:
    api_key = str(runtime_env.get("GEMINI_API_KEY") or "").strip()
    if not api_key:
        raise NovelWritingAssistantError("Novel writing assistant is missing GEMINI_API_KEY.")

    model = str(runtime_env.get("AUTONOVEL_WRITER_MODEL") or "gemini-3.1-pro-preview").strip()
    base_url = str(runtime_env.get("AUTONOVEL_API_BASE_URL") or "https://generativelanguage.googleapis.com").strip()
    language = writing_language.strip() or str(runtime_env.get("AUTONOVEL_WRITING_LANGUAGE") or "Simplified Chinese")
    system, prompt = build_assistant_prompt(
        stage=stage,
        title=title.strip(),
        writing_language=language,
        instruction=instruction.strip(),
        brief=brief,
    )
    payload = {
        "system_instruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.55,
            "maxOutputTokens": 6000,
        },
    }
    headers = {
        "content-type": "application/json",
        "x-goog-api-key": api_key,
    }

    try:
        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(_messages_url(base_url, model), headers=headers, json=payload)
            response.raise_for_status()
    except httpx.HTTPError as exc:
        raise NovelWritingAssistantError(f"Novel writing assistant request failed: {exc}") from exc

    text = _extract_text(response.json())
    if not text:
        raise NovelWritingAssistantError("Novel writing assistant returned an empty response.")
    return text
