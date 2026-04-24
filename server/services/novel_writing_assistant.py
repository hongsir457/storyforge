from __future__ import annotations

import json
import re
import textwrap
from typing import Any, Literal, TypedDict, cast
from urllib.parse import quote

import httpx

NovelAssistantStage = Literal["seed", "style", "world", "characters", "plot", "outline"]
NovelAssistantChatRole = Literal["user", "assistant"]


class NovelAssistantChatMessage(TypedDict):
    role: NovelAssistantChatRole
    content: str


class NovelAssistantChatResult(TypedDict):
    stage: NovelAssistantStage
    reply: str
    draft: str | None
    ready_to_confirm: bool


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


def _stage_status(confirmed: dict[str, bool]) -> str:
    lines: list[str] = []
    for stage, label in STAGE_LABELS.items():
        marker = "confirmed" if confirmed.get(stage) else "open"
        lines.append(f"- {label}: {marker}")
    return "\n".join(lines)


def _conversation_context(messages: list[NovelAssistantChatMessage]) -> str:
    if not messages:
        return "(No prior chat in this assistant session.)"
    chunks: list[str] = []
    for message in messages[-16:]:
        role = str(message.get("role") or "").strip() or "user"
        content = str(message.get("content") or "").strip()
        if not content:
            continue
        chunks.append(f"{role.upper()}: {content}")
    return "\n\n".join(chunks) or "(No prior chat in this assistant session.)"


def build_assistant_chat_prompt(
    *,
    stage: NovelAssistantStage,
    title: str,
    writing_language: str,
    message: str,
    brief: dict[str, str],
    confirmed: dict[str, bool],
    messages: list[NovelAssistantChatMessage],
) -> tuple[str, str]:
    stage_label = STAGE_LABELS[stage]
    stage_instruction = STAGE_INSTRUCTIONS[stage]
    existing_context = _context_from_brief(brief)
    conversation = _conversation_context(messages)

    system = (
        "You are Frametale's conversational novel writing agent. "
        "Guide the user through exactly six planning stages: Seed, Style, Worldbuilding, Characters, Plot, Outline. "
        "You are a collaborative editor, not a one-shot generator. Ask concrete questions, propose tradeoffs, "
        "turn confirmed choices into editable draft text, and keep the user moving one stage at a time. "
        "Do not flatter. Do not produce generic writing advice. "
        f"Write all natural-language strings in {writing_language}."
    )
    user_prompt = f"""
Novel title:
{title or "(not set yet)"}

Current stage:
{stage_label}

Current stage objective:
{stage_instruction}

Stage confirmation status:
{_stage_status(confirmed)}

Current creative brief:
{existing_context}

Recent assistant conversation:
{conversation}

Latest user message:
{message}

Respond as a writing agent. Return JSON only, with exactly these keys:
{{
  "stage": "{stage}",
  "reply": "a conversational assistant response",
  "draft": "editable draft text for the current stage, or null",
  "ready_to_confirm": false
}}

Rules:
- Keep "stage" as one of: seed, style, world, characters, plot, outline.
- Stay on the current stage unless the user explicitly asks to move or the current stage is already confirmed.
- The reply should guide the user and ask at most two concrete questions.
- If the user asks you to generate, refine, rewrite, summarize, or decide, include a "draft" for the active stage.
- The draft must be directly usable in the novel seed brief. Do not include a "Decisions To Confirm" heading inside draft.
- If the draft is strong enough for the user to approve after editing, set "ready_to_confirm" to true.
- Respect already confirmed brief sections unless the user explicitly changes them.
- For the outline stage, include chapter count, chapter titles or arcs, major beats, and target word counts.
""".strip()
    return system, textwrap.dedent(user_prompt)


def _extract_json_object(text: str) -> dict[str, Any] | None:
    stripped = text.strip()
    if not stripped:
        return None
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", stripped, flags=re.DOTALL | re.IGNORECASE)
    if fenced:
        stripped = fenced.group(1).strip()
    else:
        first = stripped.find("{")
        last = stripped.rfind("}")
        if first >= 0 and last > first:
            stripped = stripped[first : last + 1]
    try:
        value = json.loads(stripped)
    except json.JSONDecodeError:
        return None
    return value if isinstance(value, dict) else None


def parse_assistant_chat_response(text: str, fallback_stage: NovelAssistantStage) -> NovelAssistantChatResult:
    payload = _extract_json_object(text)
    if payload is None:
        return {
            "stage": fallback_stage,
            "reply": text.strip(),
            "draft": None,
            "ready_to_confirm": False,
        }

    stage = payload.get("stage")
    if stage not in STAGE_LABELS:
        stage = fallback_stage
    draft = payload.get("draft")
    if draft is not None:
        draft = str(draft).strip() or None
    reply = str(payload.get("reply") or "").strip()
    if not reply:
        reply = draft or text.strip()
    return {
        "stage": cast(NovelAssistantStage, stage),
        "reply": reply,
        "draft": draft,
        "ready_to_confirm": bool(payload.get("ready_to_confirm")),
    }


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


async def generate_novel_assistant_chat(
    *,
    runtime_env: dict[str, str],
    stage: NovelAssistantStage,
    title: str,
    writing_language: str,
    message: str,
    brief: dict[str, str],
    confirmed: dict[str, bool],
    messages: list[NovelAssistantChatMessage],
) -> NovelAssistantChatResult:
    api_key = str(runtime_env.get("GEMINI_API_KEY") or "").strip()
    if not api_key:
        raise NovelWritingAssistantError("Novel writing assistant is missing GEMINI_API_KEY.")

    model = str(runtime_env.get("AUTONOVEL_WRITER_MODEL") or "gemini-3.1-pro-preview").strip()
    base_url = str(runtime_env.get("AUTONOVEL_API_BASE_URL") or "https://generativelanguage.googleapis.com").strip()
    language = writing_language.strip() or str(runtime_env.get("AUTONOVEL_WRITING_LANGUAGE") or "Simplified Chinese")
    system, prompt = build_assistant_chat_prompt(
        stage=stage,
        title=title.strip(),
        writing_language=language,
        message=message.strip(),
        brief=brief,
        confirmed=confirmed,
        messages=messages,
    )
    payload = {
        "system_instruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.62,
            "maxOutputTokens": 6000,
            "responseMimeType": "application/json",
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
    return parse_assistant_chat_response(text, stage)
