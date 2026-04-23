"""
Project-level visual system defaults and prompt helpers.
"""

from __future__ import annotations

from copy import deepcopy
from typing import Any

DEFAULT_VISUAL_CAPTURE: dict[str, Any] = {
    "enabled": True,
    "use_previous_storyboard": True,
    "reference_mode": "balanced",
    "continuity_notes": "",
}

DEFAULT_TONE_CONSOLE: dict[str, Any] = {
    "palette_mode": "story-led",
    "saturation": 0,
    "warmth": 0,
    "contrast": 0,
    "tone_notes": "",
}

DEFAULT_STORYBOARD_SYNC: dict[str, Any] = {
    "sync_story_beats": True,
    "sync_camera_language": True,
    "export_notes": "",
}

VISUAL_CAPTURE_MODES = {"balanced", "composition", "tone"}
TONE_PALETTE_MODES = {
    "story-led",
    "editorial-warm",
    "cool-cinematic",
    "noir-contrast",
    "dream-wash",
}

_CAPTURE_MODE_GUIDANCE = {
    "balanced": "Keep framing, scene detail, and overall tone coherent with adjacent frames.",
    "composition": "Prioritize blocking, lens geography, and framing continuity with adjacent frames.",
    "tone": "Prioritize lighting, palette, and atmosphere continuity with adjacent frames.",
}

_PALETTE_MODE_GUIDANCE = {
    "story-led": "Let the scene's own dramatic needs drive the palette before stylization.",
    "editorial-warm": "Favor warm editorial toning, soft highlight rolloff, and clean skin-tone separation.",
    "cool-cinematic": "Favor cooler cinematic separation with restrained warmth and controlled highlights.",
    "noir-contrast": "Push contrast, richer blacks, and graphic light separation without crushing detail.",
    "dream-wash": "Favor hazy diffusion, lifted softness, and gently romanticized color transitions.",
}


def _clean_text(value: Any) -> str:
    return str(value or "").strip()


def _coerce_bool(value: Any, default: bool) -> bool:
    if isinstance(value, bool):
        return value
    return default


def _clamp_signed_level(value: Any, default: int) -> int:
    if isinstance(value, bool):
        return default
    try:
        numeric = int(value)
    except (TypeError, ValueError):
        return default
    return max(-2, min(2, numeric))


def get_default_visual_capture() -> dict[str, Any]:
    return deepcopy(DEFAULT_VISUAL_CAPTURE)


def get_default_tone_console() -> dict[str, Any]:
    return deepcopy(DEFAULT_TONE_CONSOLE)


def get_default_storyboard_sync() -> dict[str, Any]:
    return deepcopy(DEFAULT_STORYBOARD_SYNC)


def normalize_visual_capture(value: Any) -> dict[str, Any]:
    incoming = value if isinstance(value, dict) else {}
    reference_mode = _clean_text(incoming.get("reference_mode")) or DEFAULT_VISUAL_CAPTURE["reference_mode"]
    if reference_mode not in VISUAL_CAPTURE_MODES:
        reference_mode = DEFAULT_VISUAL_CAPTURE["reference_mode"]
    return {
        "enabled": _coerce_bool(incoming.get("enabled"), DEFAULT_VISUAL_CAPTURE["enabled"]),
        "use_previous_storyboard": _coerce_bool(
            incoming.get("use_previous_storyboard"),
            DEFAULT_VISUAL_CAPTURE["use_previous_storyboard"],
        ),
        "reference_mode": reference_mode,
        "continuity_notes": _clean_text(incoming.get("continuity_notes")),
    }


def normalize_tone_console(value: Any) -> dict[str, Any]:
    incoming = value if isinstance(value, dict) else {}
    palette_mode = _clean_text(incoming.get("palette_mode")) or DEFAULT_TONE_CONSOLE["palette_mode"]
    if palette_mode not in TONE_PALETTE_MODES:
        palette_mode = DEFAULT_TONE_CONSOLE["palette_mode"]
    return {
        "palette_mode": palette_mode,
        "saturation": _clamp_signed_level(incoming.get("saturation"), DEFAULT_TONE_CONSOLE["saturation"]),
        "warmth": _clamp_signed_level(incoming.get("warmth"), DEFAULT_TONE_CONSOLE["warmth"]),
        "contrast": _clamp_signed_level(incoming.get("contrast"), DEFAULT_TONE_CONSOLE["contrast"]),
        "tone_notes": _clean_text(incoming.get("tone_notes")),
    }


def normalize_storyboard_sync(value: Any) -> dict[str, Any]:
    incoming = value if isinstance(value, dict) else {}
    return {
        "sync_story_beats": _coerce_bool(
            incoming.get("sync_story_beats"),
            DEFAULT_STORYBOARD_SYNC["sync_story_beats"],
        ),
        "sync_camera_language": _coerce_bool(
            incoming.get("sync_camera_language"),
            DEFAULT_STORYBOARD_SYNC["sync_camera_language"],
        ),
        "export_notes": _clean_text(incoming.get("export_notes")),
    }


def normalize_project_visual_settings(project: dict[str, Any]) -> dict[str, Any]:
    project["visual_capture"] = normalize_visual_capture(project.get("visual_capture"))
    project["tone_console"] = normalize_tone_console(project.get("tone_console"))
    project["storyboard_sync"] = normalize_storyboard_sync(project.get("storyboard_sync"))
    return project


def should_use_previous_storyboard_reference(project: dict[str, Any]) -> bool:
    normalize_project_visual_settings(project)
    visual_capture = project["visual_capture"]
    return bool(visual_capture["enabled"] and visual_capture["use_previous_storyboard"])


def get_visual_capture_reference_mode(project: dict[str, Any]) -> str:
    normalize_project_visual_settings(project)
    return str(project["visual_capture"]["reference_mode"])


def _describe_signed_level(label: str, value: int) -> str | None:
    if value == 0:
        return None
    direction = "increase" if value > 0 else "reduce"
    amount = {1: "slightly", 2: "deliberately"}[abs(value)]
    return f"{direction} {label} {amount}"


def build_tone_console_guidance(project: dict[str, Any]) -> str:
    normalize_project_visual_settings(project)
    tone = project["tone_console"]
    parts: list[str] = [_PALETTE_MODE_GUIDANCE[tone["palette_mode"]]]

    for label, value in (
        ("saturation", tone["saturation"]),
        ("warmth", tone["warmth"]),
        ("contrast", tone["contrast"]),
    ):
        described = _describe_signed_level(label, int(value))
        if described:
            parts.append(described)

    if tone["tone_notes"]:
        parts.append(tone["tone_notes"])

    return " ".join(parts).strip()


def build_storyboard_visual_direction(project: dict[str, Any]) -> str:
    normalize_project_visual_settings(project)
    visual_capture = project["visual_capture"]
    storyboard_sync = project["storyboard_sync"]
    parts: list[str] = []

    style_description = _clean_text(project.get("style_description"))
    if style_description:
        parts.append(f"Project style reference: {style_description}.")

    tone_guidance = build_tone_console_guidance(project)
    if tone_guidance:
        parts.append(tone_guidance)

    if visual_capture["enabled"]:
        parts.append(_CAPTURE_MODE_GUIDANCE[visual_capture["reference_mode"]])
        if visual_capture["continuity_notes"]:
            parts.append(visual_capture["continuity_notes"])

    if storyboard_sync["sync_story_beats"]:
        parts.append("Translate the current story beat into a clearly readable visual progression.")

    return " ".join(parts).strip()


def build_video_visual_direction(project: dict[str, Any]) -> str:
    normalize_project_visual_settings(project)
    storyboard_sync = project["storyboard_sync"]
    parts: list[str] = []

    tone_guidance = build_tone_console_guidance(project)
    if tone_guidance:
        parts.append(tone_guidance)

    if storyboard_sync["sync_story_beats"]:
        parts.append("Preserve the emotional beat progression already established by the storyboard sequence.")
    if storyboard_sync["sync_camera_language"]:
        parts.append("Keep camera language aligned with the established storyboard framing and transitions.")
    if storyboard_sync["export_notes"]:
        parts.append(storyboard_sync["export_notes"])

    return " ".join(parts).strip()
