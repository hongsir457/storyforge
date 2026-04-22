#!/usr/bin/env python3
from __future__ import annotations

import argparse
import importlib.util
import json
import random
import re
import shutil
import sys
import textwrap
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

PROJECT_NAME_RE = re.compile(r"^[A-Za-z0-9-]+$")
LATIN_TOKEN_RE = re.compile(r"[A-Za-z][A-Za-z'-]*")
SENTENCE_BREAK_RE = re.compile(r"(?<=[.!?])\s+")
CAMERA_MOTION_HINTS = {
    "walk": "Tracking Shot",
    "run": "Tracking Shot",
    "ran": "Tracking Shot",
    "cross": "Tracking Shot",
    "crossed": "Tracking Shot",
    "enter": "Tracking Shot",
    "entered": "Tracking Shot",
    "turn": "Pan Left",
    "turned": "Pan Left",
    "look": "Zoom In",
    "looked": "Zoom In",
    "stare": "Zoom In",
    "stared": "Zoom In",
}
SHOT_TYPES = (
    "Close-up",
    "Medium Close-up",
    "Medium Shot",
    "Medium Long Shot",
    "Long Shot",
)
AUTOVIDEO_SUBDIRS = (
    "source",
    "scripts",
    "drafts",
    "characters",
    "clues",
    "storyboards",
    "videos",
    "thumbnails",
    "output",
    "grids",
)


@dataclass
class CharacterRecord:
    name: str
    description: str
    aliases: tuple[str, ...]


def parse_args() -> argparse.Namespace:
    repo_root = Path(__file__).resolve().parent.parent
    parser = argparse.ArgumentParser(
        description="Import a completed autonovel manuscript into Frametale as a narration project."
    )
    parser.add_argument(
        "--autonovel-dir",
        type=Path,
        default=repo_root / "autonovel",
        help="Path to the autonovel repository.",
    )
    parser.add_argument(
        "--autovideo-dir",
        "--autovedio-dir",
        type=Path,
        default=repo_root,
        help="Path to the Frametale repository.",
    )
    parser.add_argument(
        "--project-name",
        required=True,
        help="Frametale project id. Letters, numbers, and hyphens only.",
    )
    parser.add_argument(
        "--project-title",
        default="",
        help="Display title used inside Frametale. Falls back to metadata or project name.",
    )
    parser.add_argument(
        "--style",
        default="Imported from autonovel. Grounded cinematic storyboard style for short-form video adaptation.",
        help="Default project-level visual style.",
    )
    parser.add_argument(
        "--aspect-ratio",
        choices=("9:16", "16:9"),
        default="9:16",
        help="Frametale project aspect ratio.",
    )
    parser.add_argument(
        "--default-duration",
        type=int,
        choices=(4, 6, 8),
        default=4,
        help="Default duration for each generated segment.",
    )
    parser.add_argument(
        "--segment-word-target",
        type=int,
        default=110,
        help="Target words per autovideo segment.",
    )
    parser.add_argument(
        "--min-segment-words",
        type=int,
        default=50,
        help="Minimum words before a segment is flushed.",
    )
    parser.add_argument(
        "--max-segment-words",
        type=int,
        default=160,
        help="Hard upper bound before a segment is split.",
    )
    return parser.parse_args()


def validate_args(args: argparse.Namespace) -> None:
    if not PROJECT_NAME_RE.fullmatch(args.project_name):
        raise SystemExit("project-name may only contain letters, numbers, and hyphens.")
    if args.min_segment_words <= 0:
        raise SystemExit("min-segment-words must be positive.")
    if args.max_segment_words < args.min_segment_words:
        raise SystemExit("max-segment-words must be greater than or equal to min-segment-words.")
    if args.segment_word_target < args.min_segment_words:
        raise SystemExit("segment-word-target must be greater than or equal to min-segment-words.")


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def write_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def ensure_project_dirs(project_dir: Path) -> None:
    for name in AUTOVIDEO_SUBDIRS:
        (project_dir / name).mkdir(parents=True, exist_ok=True)


def markdown_heading_title(text: str) -> str:
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("# "):
            value = stripped[2:].strip()
            if value and value.lower() != "outline":
                return value
        if stripped.startswith("### "):
            value = stripped[4:].strip()
            if value and "reference" not in value.lower():
                return value
    return ""


def coalesce_title(project_title: str, project_name: str, autonovel_dir: Path) -> str:
    if project_title.strip():
        return project_title.strip()
    for candidate in ("world.md", "characters.md", "canon.md"):
        path = autonovel_dir / candidate
        if path.exists():
            title = markdown_heading_title(read_text(path))
            if title:
                return title
    return project_name


def chapter_files(autonovel_dir: Path) -> list[Path]:
    files = sorted((autonovel_dir / "chapters").glob("ch_*.md"))
    if not files:
        raise SystemExit(
            "No chapter files were found under autonovel/chapters. Run autonovel first, or point --autonovel-dir at a completed manuscript."
        )
    return files


def split_heading_and_body(text: str, fallback_title: str) -> tuple[str, str]:
    lines = text.splitlines()
    if lines and lines[0].strip().startswith("#"):
        title = lines[0].strip().lstrip("#").strip()
        body = "\n".join(lines[1:]).strip()
        return title or fallback_title, body
    return fallback_title, text.strip()


def clean_markdown_line(line: str) -> str:
    line = line.strip()
    if not line or line == "---":
        return ""
    line = re.sub(r"\*\*(.*?)\*\*", r"\1", line)
    line = re.sub(r"\*(.*?)\*", r"\1", line)
    line = re.sub(r"`([^`]*)`", r"\1", line)
    return line.strip()


def word_count(text: str) -> int:
    latin_tokens = LATIN_TOKEN_RE.findall(text)
    if latin_tokens:
        return len(latin_tokens)
    no_space = re.sub(r"\s+", "", text)
    return len(no_space)


def chunk_long_paragraph(paragraph: str, max_words: int) -> list[str]:
    if word_count(paragraph) <= max_words:
        return [paragraph.strip()]
    sentences = [part.strip() for part in SENTENCE_BREAK_RE.split(paragraph.strip()) if part.strip()]
    if len(sentences) <= 1:
        return [paragraph.strip()]

    chunks: list[str] = []
    current: list[str] = []
    current_words = 0
    for sentence in sentences:
        sentence_words = word_count(sentence)
        if current and current_words + sentence_words > max_words:
            chunks.append(" ".join(current).strip())
            current = [sentence]
            current_words = sentence_words
        else:
            current.append(sentence)
            current_words += sentence_words
    if current:
        chunks.append(" ".join(current).strip())
    return chunks


def paragraph_units(chapter_body: str, max_words: int) -> list[str]:
    raw_paragraphs = [part.strip() for part in re.split(r"\n\s*\n", chapter_body) if part.strip()]
    units: list[str] = []
    for paragraph in raw_paragraphs:
        units.extend(chunk_long_paragraph(paragraph, max_words))
    return [unit for unit in units if unit]


def segment_chapter(chapter_body: str, target_words: int, min_words: int, max_words: int) -> list[str]:
    units = paragraph_units(chapter_body, max_words)
    if not units:
        return []

    segments: list[str] = []
    current: list[str] = []
    current_words = 0

    for unit in units:
        unit_words = word_count(unit)
        if current and (
            current_words + unit_words > max_words or (current_words >= min_words and current_words >= target_words)
        ):
            segments.append("\n\n".join(current).strip())
            current = [unit]
            current_words = unit_words
        else:
            current.append(unit)
            current_words += unit_words

    if current:
        if segments and current_words < min_words:
            segments[-1] = (segments[-1] + "\n\n" + "\n\n".join(current)).strip()
        else:
            segments.append("\n\n".join(current).strip())

    return segments


def summarize_excerpt(text: str, limit: int = 280) -> str:
    collapsed = re.sub(r"\s+", " ", text).strip()
    if len(collapsed) <= limit:
        return collapsed
    return collapsed[: limit - 1].rstrip() + "…"


def detect_camera_motion(text: str) -> str:
    lowered = text.lower()
    for hint, motion in CAMERA_MOTION_HINTS.items():
        if re.search(rf"\b{re.escape(hint)}\b", lowered):
            return motion
    return "Static"


def detect_shot_type(text: str) -> str:
    words = word_count(text)
    lowered = text.lower()
    if re.search(r"\b(eye|eyes|face|hand|hands|mouth|voice|whisper|whispered)\b", lowered):
        return "Close-up"
    if words <= 60:
        return "Medium Close-up"
    if words <= 120:
        return "Medium Shot"
    if words <= 180:
        return "Medium Long Shot"
    return "Long Shot"


def extract_dialogue(text: str) -> list[dict[str, str]]:
    snippets = re.findall(r'"([^"\n]{2,180})"', text)
    dialogue: list[dict[str, str]] = []
    for snippet in snippets[:3]:
        line = re.sub(r"\s+", " ", snippet).strip()
        if line:
            dialogue.append({"speaker": "Unknown", "line": line})
    return dialogue


def create_generated_assets() -> dict:
    return {
        "storyboard_image": None,
        "storyboard_last_image": None,
        "video_clip": None,
        "video_thumbnail": None,
        "video_uri": None,
        "grid_id": None,
        "grid_cell_index": None,
        "status": "pending",
    }


def segment_payload(segment_text: str, episode_number: int, segment_number: int, duration_seconds: int) -> dict:
    excerpt = summarize_excerpt(segment_text, limit=360)
    shot_type = detect_shot_type(segment_text)
    camera_motion = detect_camera_motion(segment_text)
    return {
        "segment_id": f"E{episode_number}S{segment_number:02d}",
        "episode": episode_number,
        "duration_seconds": duration_seconds,
        "segment_break": segment_number > 1,
        "novel_text": segment_text.strip(),
        "characters_in_segment": [],
        "clues_in_segment": [],
        "image_prompt": {
            "scene": (
                "Storyboard frame adapted from the novel excerpt. Preserve narrative clarity, grounded emotion, "
                f"and visual continuity. Source excerpt: {excerpt}"
            ),
            "composition": {
                "shot_type": shot_type,
                "lighting": "Naturalistic cinematic lighting that fits the source excerpt.",
                "ambiance": "Grounded, dramatic, story-first mood with clear subject focus.",
            },
        },
        "video_prompt": {
            "action": (
                "Animate the core action from the excerpt with restrained cinematic motion and stable character continuity. "
                f"Source excerpt: {excerpt}"
            ),
            "camera_motion": camera_motion,
            "ambiance_audio": "Diegetic ambience only. Match the environment described in the excerpt. No music.",
            "dialogue": extract_dialogue(segment_text),
        },
        "transition_to_next": "cut",
        "note": "Imported automatically from autonovel.",
        "generated_assets": create_generated_assets(),
    }


def normalize_display_name(name: str) -> str:
    if any("\u4e00" <= ch <= "\u9fff" for ch in name):
        return name.strip()
    return " ".join(part.capitalize() for part in name.strip().split())


def markdown_sections(text: str, heading_prefix: str = "### ") -> list[tuple[str, str]]:
    lines = text.splitlines()
    sections: list[tuple[str, str]] = []
    current_heading = ""
    current_body: list[str] = []
    for line in lines:
        if line.startswith(heading_prefix):
            if current_heading:
                sections.append((current_heading, "\n".join(current_body).strip()))
            current_heading = line[len(heading_prefix) :].strip()
            current_body = []
        elif current_heading:
            current_body.append(line)
    if current_heading:
        sections.append((current_heading, "\n".join(current_body).strip()))
    return sections


def extract_description(block: str) -> str:
    description_lines: list[str] = []
    for raw_line in block.splitlines():
        line = clean_markdown_line(raw_line)
        if not line:
            continue
        if raw_line.startswith("#### "):
            if description_lines:
                break
            continue
        if raw_line.startswith("|") or raw_line.startswith("---"):
            continue
        description_lines.append(line)
        if len(" ".join(description_lines)) >= 320:
            break
    return " ".join(description_lines)[:400].strip()


def collect_character_records(autonovel_dir: Path) -> list[CharacterRecord]:
    characters_path = autonovel_dir / "characters.md"
    if not characters_path.exists():
        return []
    raw = read_text(characters_path)
    candidate_sections = markdown_sections(raw)
    names: list[str] = []
    descriptions: dict[str, str] = {}
    token_frequency: dict[str, int] = {}

    for heading, block in candidate_sections:
        if not extract_description(block):
            continue
        if "**Age:**" not in block and "**Role:**" not in block:
            continue
        name = normalize_display_name(heading)
        if len(name) < 2:
            continue
        names.append(name)
        descriptions[name] = extract_description(block)
        for token in re.findall(r"[A-Za-z][A-Za-z'-]*", name.lower()):
            token_frequency[token] = token_frequency.get(token, 0) + 1

    records: list[CharacterRecord] = []
    for name in names:
        aliases = [name]
        tokens = re.findall(r"[A-Za-z][A-Za-z'-]*", name)
        if len(tokens) >= 1:
            first = tokens[0].lower()
            if len(first) >= 3 and token_frequency.get(first) == 1:
                aliases.append(tokens[0])
        if len(tokens) >= 2:
            last = tokens[-1].lower()
            if len(last) >= 3 and token_frequency.get(last) == 1:
                aliases.append(tokens[-1])
        records.append(
            CharacterRecord(
                name=name,
                description=descriptions[name],
                aliases=tuple(dict.fromkeys(alias for alias in aliases if alias)),
            )
        )
    return records


def segment_mentions_character(segment_text: str, record: CharacterRecord) -> bool:
    lowered = segment_text.lower()
    for alias in record.aliases:
        alias_lower = alias.lower()
        if " " in alias_lower:
            if alias_lower in lowered:
                return True
            continue
        if alias_lower.isascii():
            if re.search(rf"\b{re.escape(alias_lower)}\b", lowered):
                return True
        elif alias_lower in lowered:
            return True
    return False


def infer_segment_characters(segment_text: str, records: list[CharacterRecord]) -> list[str]:
    names = [record.name for record in records if segment_mentions_character(segment_text, record)]
    return names[:8]


def project_characters(records: list[CharacterRecord]) -> dict[str, dict[str, str]]:
    return {
        record.name: {
            "description": record.description,
            "voice_style": "",
            "character_sheet": "",
        }
        for record in records
    }


def copy_if_exists(source: Path, target: Path) -> None:
    if source.exists():
        shutil.copyfile(source, target)


def concatenate_manuscript(chapters: list[tuple[str, str]]) -> str:
    parts: list[str] = []
    for title, body in chapters:
        parts.append(f"# {title}\n\n{body.strip()}")
    return "\n\n---\n\n".join(parts).strip() + "\n"


def validate_with_autovideo(
    autovideo_dir: Path, projects_root: Path, project_name: str
) -> tuple[bool, list[str], list[str]]:
    validator_path = autovideo_dir / "lib" / "data_validator.py"
    if not validator_path.exists():
        return False, [f"autovideo validator file not found: {validator_path}"], []

    try:
        spec = importlib.util.spec_from_file_location("autovideo_data_validator", validator_path)
        if spec is None or spec.loader is None:
            raise ImportError(f"Unable to load module spec from {validator_path}")
        module = importlib.util.module_from_spec(spec)
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        DataValidator = module.DataValidator
    except Exception as exc:  # pragma: no cover
        return False, [f"Unable to import autovideo validator: {exc}"], []

    validator = DataValidator(str(projects_root))
    result = validator.validate_project_dir(projects_root / project_name)
    if not result.valid:
        return False, list(result.errors), list(result.warnings)
    return True, [], list(result.warnings)


def main() -> None:
    args = parse_args()
    validate_args(args)

    autonovel_dir = args.autonovel_dir.resolve()
    autovideo_dir = args.autovideo_dir.resolve()
    projects_root = autovideo_dir / "projects"

    if not autonovel_dir.exists():
        raise SystemExit(f"autonovel directory does not exist: {autonovel_dir}")
    if not autovideo_dir.exists():
        raise SystemExit(f"Frametale directory does not exist: {autovideo_dir}")
    if not projects_root.exists():
        raise SystemExit(f"Frametale projects directory does not exist: {projects_root}")

    final_project_dir = projects_root / args.project_name
    if final_project_dir.exists():
        raise SystemExit(f"Frametale project already exists: {final_project_dir}")

    chapter_paths = chapter_files(autonovel_dir)
    project_title = coalesce_title(args.project_title, args.project_name, autonovel_dir)
    character_records = collect_character_records(autonovel_dir)

    timestamp = datetime.now().isoformat()
    temp_project_name = f"{args.project_name}-import-{random.randint(1000, 9999)}"
    temp_project_dir = projects_root / temp_project_name
    if temp_project_dir.exists():
        raise SystemExit(f"Temporary import directory already exists: {temp_project_dir}")

    ensure_project_dirs(temp_project_dir)

    copied_sources = {
        "world.md": autonovel_dir / "world.md",
        "characters.md": autonovel_dir / "characters.md",
        "outline.md": autonovel_dir / "outline.md",
        "canon.md": autonovel_dir / "canon.md",
        "state.json": autonovel_dir / "state.json",
    }
    for target_name, source_path in copied_sources.items():
        copy_if_exists(source_path, temp_project_dir / "source" / target_name)

    chapters_for_manuscript: list[tuple[str, str]] = []
    episodes: list[dict[str, object]] = []
    total_segments = 0

    for episode_number, chapter_path in enumerate(chapter_paths, start=1):
        fallback_title = f"Chapter {episode_number}"
        chapter_text = read_text(chapter_path)
        chapter_title, chapter_body = split_heading_and_body(chapter_text, fallback_title)
        chapters_for_manuscript.append((chapter_title, chapter_body))

        source_copy_name = f"chapter_{episode_number:02d}.md"
        shutil.copyfile(chapter_path, temp_project_dir / "source" / source_copy_name)

        segment_texts = segment_chapter(
            chapter_body,
            target_words=args.segment_word_target,
            min_words=args.min_segment_words,
            max_words=args.max_segment_words,
        )
        if not segment_texts:
            raise SystemExit(f"Failed to derive segments for chapter: {chapter_path}")

        segments = []
        for segment_number, segment_text in enumerate(segment_texts, start=1):
            payload = segment_payload(segment_text, episode_number, segment_number, args.default_duration)
            payload["characters_in_segment"] = infer_segment_characters(segment_text, character_records)
            segments.append(payload)

        total_segments += len(segments)
        episode_payload = {
            "episode": episode_number,
            "title": chapter_title,
            "content_mode": "narration",
            "duration_seconds": len(segments) * args.default_duration,
            "summary": summarize_excerpt(chapter_body, limit=260),
            "novel": {
                "title": project_title,
                "chapter": chapter_title,
            },
            "segments": segments,
            "metadata": {
                "status": "imported",
                "created_at": timestamp,
                "updated_at": timestamp,
                "total_scenes": len(segments),
                "estimated_duration_seconds": len(segments) * args.default_duration,
            },
        }
        script_filename = f"episode_{episode_number:02d}.json"
        write_json(temp_project_dir / "scripts" / script_filename, episode_payload)
        episodes.append(
            {
                "episode": episode_number,
                "title": chapter_title,
                "script_file": f"scripts/{script_filename}",
            }
        )

    manuscript = concatenate_manuscript(chapters_for_manuscript)
    (temp_project_dir / "source" / "full_novel.md").write_text(manuscript, encoding="utf-8")

    manifest = {
        "imported_at": timestamp,
        "source_repo": str(autonovel_dir),
        "project_title": project_title,
        "chapter_count": len(chapter_paths),
        "segment_count": total_segments,
        "default_duration_seconds": args.default_duration,
        "aspect_ratio": args.aspect_ratio,
    }
    write_json(temp_project_dir / "source" / "import_manifest.json", manifest)

    project_payload = {
        "title": project_title,
        "content_mode": "narration",
        "aspect_ratio": args.aspect_ratio,
        "style": args.style.strip(),
        "default_duration": args.default_duration,
        "episodes": episodes,
        "characters": project_characters(character_records),
        "clues": {},
        "metadata": {
            "created_at": timestamp,
            "updated_at": timestamp,
            "source": "autonovel",
            "imported_at": timestamp,
        },
    }
    write_json(temp_project_dir / "project.json", project_payload)

    valid, errors, warnings = validate_with_autovideo(autovideo_dir, projects_root, temp_project_name)
    if not valid:
        joined = "\n".join(f"- {item}" for item in errors)
        raise SystemExit(
            "Frametale validation failed for the imported project.\n"
            f"Temporary project left at: {temp_project_dir}\n"
            f"{joined}"
        )

    temp_project_dir.rename(final_project_dir)

    print(f"Imported autonovel manuscript into Frametale: {final_project_dir}")
    print(f"Chapters: {len(chapter_paths)}")
    print(f"Segments: {total_segments}")
    if warnings:
        print("Validator warnings:")
        for warning in warnings:
            print(textwrap.indent(warning, prefix="- "))


if __name__ == "__main__":
    main()
