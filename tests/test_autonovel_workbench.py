# ruff: noqa: I001
import asyncio
import sys
from pathlib import Path

import pytest

AUTONOVEL_DIR = Path(__file__).resolve().parents[1] / "autonovel"
if str(AUTONOVEL_DIR) not in sys.path:
    sys.path.insert(0, str(AUTONOVEL_DIR))

from anthropic_compat import build_headers
from build_arc_summary import discover_chapter_files
from build_outline import discover_chapter_files as discover_outline_chapter_files
from server.services.autonovel_workbench import NovelWorkbenchService


def _make_workbench_layout(root: Path) -> None:
    (root / "projects").mkdir()
    (root / "autonovel").mkdir()
    (root / "tools").mkdir()
    (root / "tools" / "import_autonovel_to_autovedio.py").write_text("# importer\n", encoding="utf-8")
    (root / "autonovel" / ".env.example").write_text(
        "\n".join(
            [
                "ANTHROPIC_API_KEY=",
                "ANTHROPIC_AUTH_TOKEN=",
                "AUTONOVEL_WRITER_MODEL=claude-sonnet-4-6",
                "AUTONOVEL_JUDGE_MODEL=claude-sonnet-4-6",
                "AUTONOVEL_REVIEW_MODEL=claude-opus-4-6",
                "AUTONOVEL_API_BASE_URL=https://api.anthropic.com",
                "FAL_KEY=",
                "ELEVENLABS_API_KEY=",
            ]
        )
        + "\n",
        encoding="utf-8",
    )


def test_status_snapshot_accepts_generated_runtime_env(tmp_path, monkeypatch):
    _make_workbench_layout(tmp_path)
    monkeypatch.delenv("AUTONOVEL_ENV_SOURCE", raising=False)
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test")

    service = NovelWorkbenchService(tmp_path)
    status = service.status_snapshot()

    assert status["requirements"]["autonovel_env_exists"] is True
    assert status["autonovel_env_mode"] == "generated"
    assert status["env_status"]["required"]["ANTHROPIC_API_KEY_OR_AUTH_TOKEN"] is True
    assert status["env_status"]["optional"]["FAL_KEY"] is False
    assert status["env_status"]["missing_required"] == []


def test_materialize_runtime_env_uses_defaults_when_source_file_missing(tmp_path, monkeypatch):
    _make_workbench_layout(tmp_path)
    monkeypatch.delenv("AUTONOVEL_ENV_SOURCE", raising=False)
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test")
    monkeypatch.delenv("AUTONOVEL_WRITER_MODEL", raising=False)
    monkeypatch.delenv("AUTONOVEL_JUDGE_MODEL", raising=False)
    monkeypatch.delenv("AUTONOVEL_REVIEW_MODEL", raising=False)
    monkeypatch.delenv("AUTONOVEL_API_BASE_URL", raising=False)

    service = NovelWorkbenchService(tmp_path)
    workspace_dir = tmp_path / "workspace-run"
    workspace_dir.mkdir()

    service._materialize_autonovel_env(workspace_dir)

    rendered = (workspace_dir / ".env").read_text(encoding="utf-8")
    assert "ANTHROPIC_API_KEY=sk-ant-test" in rendered
    assert "AUTONOVEL_WRITER_MODEL=claude-sonnet-4-6" in rendered
    assert "AUTONOVEL_JUDGE_MODEL=claude-sonnet-4-6" in rendered
    assert "AUTONOVEL_REVIEW_MODEL=claude-opus-4-6" in rendered
    assert "AUTONOVEL_API_BASE_URL=https://api.anthropic.com" in rendered


def test_status_snapshot_accepts_openrouter_auth_token(tmp_path, monkeypatch):
    _make_workbench_layout(tmp_path)
    monkeypatch.delenv("AUTONOVEL_ENV_SOURCE", raising=False)
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.setenv("ANTHROPIC_AUTH_TOKEN", "sk-or-test")

    service = NovelWorkbenchService(tmp_path)
    status = service.status_snapshot()

    assert status["requirements"]["autonovel_env_exists"] is True
    assert status["env_status"]["required"]["ANTHROPIC_API_KEY_OR_AUTH_TOKEN"] is True


def test_materialize_runtime_env_prefers_openrouter_base_when_auth_token_exists(tmp_path, monkeypatch):
    _make_workbench_layout(tmp_path)
    monkeypatch.delenv("AUTONOVEL_ENV_SOURCE", raising=False)
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test")
    monkeypatch.setenv("ANTHROPIC_AUTH_TOKEN", "sk-or-test")
    monkeypatch.delenv("AUTONOVEL_API_BASE_URL", raising=False)
    monkeypatch.delenv("ANTHROPIC_BASE_URL", raising=False)

    service = NovelWorkbenchService(tmp_path)
    workspace_dir = tmp_path / "workspace-run"
    workspace_dir.mkdir()

    service._materialize_autonovel_env(workspace_dir)

    rendered = (workspace_dir / ".env").read_text(encoding="utf-8")
    assert "AUTONOVEL_API_BASE_URL=https://openrouter.ai/api" in rendered


def test_prepare_workspace_bootstraps_git_repo_when_source_is_plain_directory(tmp_path, monkeypatch):
    _make_workbench_layout(tmp_path)
    (tmp_path / "autonovel" / "run_pipeline.py").write_text("print('ok')\n", encoding="utf-8")
    monkeypatch.delenv("AUTONOVEL_ENV_SOURCE", raising=False)
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test")

    service = NovelWorkbenchService(tmp_path)
    workspace_dir = service.workspaces_dir / "job-test"
    job = {
        "job_id": "job-test",
        "log_path": str(tmp_path / "projects" / ".novel_workbench" / "logs" / "job-test.log"),
        "seed_text": "seed",
    }

    asyncio.run(service._prepare_workspace(job, workspace_dir))

    assert (workspace_dir / ".git").exists() is True


def test_build_headers_prefers_anthropic_api_key_for_official_base(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test")
    monkeypatch.setenv("ANTHROPIC_AUTH_TOKEN", "sk-or-test")

    headers = build_headers(base_url="https://api.anthropic.com")

    assert headers["x-api-key"] == "sk-ant-test"
    assert "authorization" not in headers


def test_discover_chapter_files_uses_actual_chapter_count(tmp_path, monkeypatch):
    chapters_dir = tmp_path / "chapters"
    chapters_dir.mkdir()
    for chapter in (1, 2, 24):
        (chapters_dir / f"ch_{chapter:02d}.md").write_text(f"# Ch {chapter}\ntext\n", encoding="utf-8")

    monkeypatch.setattr("build_arc_summary.CHAPTERS_DIR", chapters_dir)

    chapter_files = discover_chapter_files()

    assert [path.name for path in chapter_files] == ["ch_01.md", "ch_02.md", "ch_24.md"]


def test_build_outline_discovers_actual_chapter_count(tmp_path, monkeypatch):
    chapters_dir = tmp_path / "chapters"
    chapters_dir.mkdir()
    for chapter in (1, 2, 24):
        (chapters_dir / f"ch_{chapter:02d}.md").write_text(f"# Ch {chapter}\ntext\n", encoding="utf-8")

    monkeypatch.setattr("build_outline.CHAPTERS_DIR", chapters_dir)

    chapter_files = discover_outline_chapter_files()

    assert [path.name for path in chapter_files] == ["ch_01.md", "ch_02.md", "ch_24.md"]


def test_create_job_defaults_visual_import_fields(tmp_path, monkeypatch):
    _make_workbench_layout(tmp_path)
    monkeypatch.delenv("AUTONOVEL_ENV_SOURCE", raising=False)
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test")

    service = NovelWorkbenchService(tmp_path)
    asyncio.run(service.startup())

    job = asyncio.run(
        service.create_job(
            title="Bell",
            seed_text="seed",
            project_name=None,
            style=None,
            aspect_ratio=None,
            default_duration=None,
        )
    )

    assert job["style"] == "Photographic"
    assert job["aspect_ratio"] == "9:16"
    assert job["default_duration"] == 4


def test_delete_job_removes_terminal_record_and_files(tmp_path, monkeypatch):
    _make_workbench_layout(tmp_path)
    monkeypatch.delenv("AUTONOVEL_ENV_SOURCE", raising=False)
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test")

    service = NovelWorkbenchService(tmp_path)
    asyncio.run(service.startup())

    workspace_dir = service.workspaces_dir / "job-delete"
    workspace_dir.mkdir(parents=True)
    (workspace_dir / "seed.txt").write_text("seed\n", encoding="utf-8")
    log_path = service.logs_dir / "job-delete.log"
    log_path.write_text("log\n", encoding="utf-8")
    service._jobs["job-delete"] = {
        "job_id": "job-delete",
        "title": "Bell",
        "seed_text": "seed",
        "style": "Photographic",
        "aspect_ratio": "9:16",
        "default_duration": 4,
        "target_project_name": "bell",
        "imported_project_name": None,
        "status": "failed",
        "stage": "failed",
        "error_message": "boom",
        "workspace_dir": str(workspace_dir),
        "log_path": str(log_path),
        "created_at": "2026-04-15T00:00:00Z",
        "updated_at": "2026-04-15T00:00:00Z",
        "started_at": "2026-04-15T00:00:00Z",
        "finished_at": "2026-04-15T00:00:00Z",
    }
    service._save_jobs_locked()

    deleted = asyncio.run(service.delete_job("job-delete"))

    assert deleted["job_id"] == "job-delete"
    assert "job-delete" not in service._jobs
    assert workspace_dir.exists() is False
    assert log_path.exists() is False


def test_delete_job_rejects_active_runs(tmp_path, monkeypatch):
    _make_workbench_layout(tmp_path)
    monkeypatch.delenv("AUTONOVEL_ENV_SOURCE", raising=False)
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test")

    service = NovelWorkbenchService(tmp_path)
    asyncio.run(service.startup())

    service._jobs["job-running"] = {
        "job_id": "job-running",
        "title": "Bell",
        "seed_text": "seed",
        "style": "Photographic",
        "aspect_ratio": "9:16",
        "default_duration": 4,
        "target_project_name": "bell",
        "imported_project_name": None,
        "status": "running",
        "stage": "pipeline",
        "error_message": None,
        "workspace_dir": str(service.workspaces_dir / "job-running"),
        "log_path": str(service.logs_dir / "job-running.log"),
        "created_at": "2026-04-15T00:00:00Z",
        "updated_at": "2026-04-15T00:00:00Z",
        "started_at": "2026-04-15T00:00:00Z",
        "finished_at": None,
    }

    with pytest.raises(Exception, match="Cancel the novel job before deleting"):
        asyncio.run(service.delete_job("job-running"))
