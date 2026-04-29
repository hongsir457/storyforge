import json
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest

AUTONOVEL_DIR = Path(__file__).resolve().parents[1] / "autonovel"
if str(AUTONOVEL_DIR) not in sys.path:
    sys.path.insert(0, str(AUTONOVEL_DIR))

import build_arc_summary
import build_outline
import evaluate
import gen_brief
import gen_revision
import reader_panel
import review


def _write_chapter(chapters_dir: Path, chapter_num: int, title: str, body: str) -> None:
    (chapters_dir / f"ch_{chapter_num:02d}.md").write_text(f"# {title}\n\n{body}\n", encoding="utf-8")


def test_build_arc_summary_falls_back_when_model_call_fails(tmp_path, monkeypatch):
    chapters_dir = tmp_path / "chapters"
    chapters_dir.mkdir()
    _write_chapter(
        chapters_dir,
        1,
        "Bell Market",
        'Cass crosses the market at dawn. "Keep your head down," his mother says. He hears a lie in the bells.',
    )
    (tmp_path / "seed.txt").write_text("A bell-hearing boy uncovers a false city contract.", encoding="utf-8")

    monkeypatch.setattr(build_arc_summary, "BASE_DIR", tmp_path)
    monkeypatch.setattr(build_arc_summary, "CHAPTERS_DIR", chapters_dir)
    monkeypatch.setattr(
        build_arc_summary, "call_writer", lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError("api down"))
    )

    build_arc_summary.main()

    rendered = (tmp_path / "arc_summary.md").read_text(encoding="utf-8")
    assert "Deterministic fallback summaries were used" in rendered
    assert "### Chapter 1" in rendered
    assert "Bell Market" in rendered


def test_build_outline_falls_back_when_model_call_fails(tmp_path, monkeypatch):
    chapters_dir = tmp_path / "chapters"
    chapters_dir.mkdir()
    _write_chapter(
        chapters_dir,
        1,
        "The Narrow Stair",
        "Cass climbs the tower. Perin warns him away from the upper bell room. The chapter ends with a locked door.",
    )

    monkeypatch.setattr(build_outline, "BASE_DIR", tmp_path)
    monkeypatch.setattr(build_outline, "CHAPTERS_DIR", chapters_dir)
    monkeypatch.setattr(
        build_outline, "call_model", lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError("api down"))
    )

    build_outline.main()

    outline = (tmp_path / "outline.md").read_text(encoding="utf-8")
    assert "### Ch 1: The Narrow Stair" in outline
    assert "## REBUILD NOTES" in outline
    assert "deterministic fallback outline entries" in outline


def test_reader_panel_writes_json_when_arc_summary_is_missing(tmp_path, monkeypatch):
    chapters_dir = tmp_path / "chapters"
    chapters_dir.mkdir()
    _write_chapter(
        chapters_dir,
        1,
        "First Lie",
        'Cass hears the market oath ring false. "You did hear it," Perin says, and then refuses to explain.',
    )

    monkeypatch.setattr(reader_panel, "BASE_DIR", tmp_path)
    monkeypatch.setattr(reader_panel, "CHAPTERS_DIR", chapters_dir)
    monkeypatch.setattr(
        reader_panel, "call_reader", lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError("api down"))
    )

    reader_panel.main()

    output = json.loads((tmp_path / "edit_logs" / "reader_panel.json").read_text(encoding="utf-8"))
    assert output["warnings"] == ["arc_summary.md missing; used chapter-excerpt fallback summary."]
    assert len(output["errors"]) == len(reader_panel.READERS)
    assert output["readers"] == {}


def test_evaluate_full_falls_back_to_latest_chapter_scores(tmp_path, monkeypatch):
    chapters_dir = tmp_path / "chapters"
    eval_logs_dir = tmp_path / "eval_logs"
    edit_logs_dir = tmp_path / "edit_logs"
    chapters_dir.mkdir()
    eval_logs_dir.mkdir()
    edit_logs_dir.mkdir()
    _write_chapter(chapters_dir, 1, "Chapter One", "Cass studies the bells.")
    _write_chapter(chapters_dir, 2, "Chapter Two", "Perin lies to Cass and the scene stalls.")

    (eval_logs_dir / "20260424_010101_ch01.json").write_text(
        json.dumps({"overall_score": 6.0, "top_3_revisions": ["Tighten the opening scene."]}),
        encoding="utf-8",
    )
    (eval_logs_dir / "20260424_010102_ch02.json").write_text(
        json.dumps({"overall_score": 4.0, "top_3_revisions": ["Rebuild the confrontation around a harder choice."]}),
        encoding="utf-8",
    )

    monkeypatch.setattr(evaluate, "BASE_DIR", tmp_path)
    monkeypatch.setattr(evaluate, "CHAPTERS_DIR", chapters_dir)
    monkeypatch.setattr(evaluate, "EVAL_LOG_DIR", eval_logs_dir)
    monkeypatch.setattr(evaluate, "EDIT_LOG_DIR", edit_logs_dir)

    result = evaluate.safe_evaluate(
        "full novel",
        lambda: (_ for _ in ()).throw(RuntimeError("api down")),
        "novel_score",
    )

    assert result["weakest_chapter"] == 2
    assert result["top_suggestion"] == "Rebuild the confrontation around a harder choice."
    assert result["novel_score"] == pytest.approx(5.0)
    assert result["evaluation_mode"] == "fallback"


def test_review_writes_failed_artifact_when_model_call_fails(tmp_path, monkeypatch):
    chapters_dir = tmp_path / "chapters"
    logs_dir = tmp_path / "edit_logs"
    chapters_dir.mkdir()
    logs_dir.mkdir()
    _write_chapter(chapters_dir, 1, "Bellroom", "Cass enters the tower and hears the bell lie.")

    monkeypatch.setattr(review, "BASE_DIR", tmp_path)
    monkeypatch.setattr(review, "CHAPTERS_DIR", chapters_dir)
    monkeypatch.setattr(review, "LOGS_DIR", logs_dir)
    monkeypatch.setattr(review, "has_auth_config", lambda: True)
    monkeypatch.setattr(
        review, "call_reviewer", lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError("api down"))
    )

    parsed = review.cmd_review(SimpleNamespace(output=None))

    review_logs = sorted(logs_dir.glob("*_review.json"))
    assert parsed["review_failed"] is True
    assert review_logs
    saved = json.loads(review_logs[-1].read_text(encoding="utf-8"))
    assert saved["review_failed"] is True
    assert "api down" in saved["error"]


def test_gen_brief_auto_falls_back_when_full_eval_lacks_weakest_chapter(tmp_path, monkeypatch):
    chapters_dir = tmp_path / "chapters"
    edit_logs_dir = tmp_path / "edit_logs"
    eval_logs_dir = tmp_path / "eval_logs"
    briefs_dir = tmp_path / "briefs"
    chapters_dir.mkdir()
    edit_logs_dir.mkdir()
    eval_logs_dir.mkdir()
    briefs_dir.mkdir()

    _write_chapter(chapters_dir, 1, "Bellroom", "Cass enters the bellroom. Perin keeps the peace.")
    _write_chapter(
        chapters_dir, 2, "The Contract", "Cass confronts Perin. The argument lands flat and ends without force."
    )
    (tmp_path / "voice.md").write_text("voice rules\n", encoding="utf-8")

    (eval_logs_dir / "20260424_020000_full.json").write_text(
        json.dumps({"novel_score": 0.0, "error": "full novel evaluation failed: api down"}),
        encoding="utf-8",
    )
    (eval_logs_dir / "20260424_020001_ch01.json").write_text(
        json.dumps({"overall_score": 7.0, "top_3_revisions": ["Keep the opening tension sharp."]}),
        encoding="utf-8",
    )
    (eval_logs_dir / "20260424_020002_ch02.json").write_text(
        json.dumps({"overall_score": 3.5, "top_3_revisions": ["Revise the confrontation around a harder choice."]}),
        encoding="utf-8",
    )

    monkeypatch.setattr(gen_brief, "BASE_DIR", tmp_path)
    monkeypatch.setattr(gen_brief, "CHAPTERS_DIR", chapters_dir)
    monkeypatch.setattr(gen_brief, "EDIT_LOGS_DIR", edit_logs_dir)
    monkeypatch.setattr(gen_brief, "EVAL_LOGS_DIR", eval_logs_dir)
    monkeypatch.setattr(gen_brief, "BRIEFS_DIR", briefs_dir)
    monkeypatch.setattr(gen_brief, "VOICE_PATH", tmp_path / "voice.md")

    chapter_num, brief = gen_brief.build_auto_brief()

    assert chapter_num == 2
    assert "Auto-selection fallback" in brief
    assert "Revise the confrontation around a harder choice." in brief


def test_gen_revision_preserves_chapter_when_model_call_fails(tmp_path, monkeypatch, capsys):
    chapters_dir = tmp_path / "chapters"
    edit_logs_dir = tmp_path / "edit_logs"
    chapters_dir.mkdir()
    edit_logs_dir.mkdir()
    _write_chapter(chapters_dir, 1, "Bellroom", "Cass enters the bellroom and hears the tower lie.")
    (tmp_path / "voice.md").write_text("voice rules\n", encoding="utf-8")
    (tmp_path / "characters.md").write_text("Cass: bell-hearing protagonist\n", encoding="utf-8")
    (tmp_path / "world.md").write_text("The city runs on contractual bells.\n", encoding="utf-8")
    brief = tmp_path / "brief.md"
    brief.write_text("Make the confrontation sharper.\n", encoding="utf-8")

    original = (chapters_dir / "ch_01.md").read_text(encoding="utf-8")
    monkeypatch.setattr(gen_revision, "BASE_DIR", tmp_path)
    monkeypatch.setattr(gen_revision, "CHAPTERS_DIR", chapters_dir)
    monkeypatch.setattr(gen_revision, "EDIT_LOGS_DIR", edit_logs_dir)
    monkeypatch.setattr(
        gen_revision, "call_writer", lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError("api down"))
    )

    gen_revision.main(["1", str(brief)])

    captured = capsys.readouterr()
    assert "REVISION_STATUS: skipped_model_failure" in captured.out
    assert (chapters_dir / "ch_01.md").read_text(encoding="utf-8") == original
    failure_logs = sorted(edit_logs_dir.glob("*_ch01_revision_failed.json"))
    assert failure_logs
    saved = json.loads(failure_logs[-1].read_text(encoding="utf-8"))
    assert saved["chapter_preserved"] is True
    assert "api down" in saved["error"]
