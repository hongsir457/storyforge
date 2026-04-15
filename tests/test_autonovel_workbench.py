from pathlib import Path

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
