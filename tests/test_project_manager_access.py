from __future__ import annotations

import json
from dataclasses import dataclass

import pytest

from lib.project_manager import ProjectManager
from lib.request_user_context import set_current_request_user


@dataclass
class _FakeUser:
    id: str
    username: str
    sub: str
    role: str = "user"


@pytest.fixture(autouse=True)
def _clear_request_user():
    set_current_request_user(None)
    yield
    set_current_request_user(None)


def _write_project(root, name: str, project: dict) -> None:
    project_dir = root / name
    project_dir.mkdir(parents=True, exist_ok=True)
    (project_dir / "project.json").write_text(json.dumps(project, ensure_ascii=False), encoding="utf-8")


def test_non_admin_cannot_see_legacy_ownerless_projects(tmp_path):
    manager = ProjectManager(str(tmp_path))
    _write_project(
        tmp_path,
        "legacy-project",
        {
            "title": "Legacy",
            "metadata": {},
        },
    )

    set_current_request_user(_FakeUser(id="user-1", username="alice", sub="alice"))

    assert manager.list_projects() == []
    assert manager.project_exists("legacy-project") is False
    with pytest.raises(FileNotFoundError):
        manager.load_project("legacy-project")


def test_new_project_is_owned_by_current_user_and_hidden_from_others(tmp_path):
    manager = ProjectManager(str(tmp_path))
    owner = _FakeUser(id="user-1", username="alice", sub="alice")
    other = _FakeUser(id="user-2", username="bob", sub="bob")

    set_current_request_user(owner)
    manager.create_project("alice-project")
    manager.create_project_metadata("alice-project", title="Alice Project")

    project = manager.load_project("alice-project")
    assert project["metadata"]["owner_user_id"] == "user-1"
    assert project["metadata"]["owner_username"] == "alice"
    assert manager.list_projects() == ["alice-project"]

    set_current_request_user(other)
    assert manager.list_projects() == []
    assert manager.project_exists("alice-project") is False
    with pytest.raises(FileNotFoundError):
        manager.load_project("alice-project")


def test_admin_can_still_access_legacy_projects(tmp_path):
    manager = ProjectManager(str(tmp_path))
    _write_project(
        tmp_path,
        "legacy-project",
        {
            "title": "Legacy",
            "metadata": {},
        },
    )

    set_current_request_user(_FakeUser(id="admin-1", username="hongsir", sub="hongsir", role="admin"))

    assert manager.list_projects() == ["legacy-project"]
    assert manager.project_exists("legacy-project") is True
    assert manager.load_project("legacy-project")["title"] == "Legacy"


def test_user_can_claim_ownerless_autonovel_import(tmp_path):
    manager = ProjectManager(str(tmp_path))
    _write_project(
        tmp_path,
        "novel-import",
        {
            "title": "Imported",
            "metadata": {"source": "autonovel"},
        },
    )

    owner = _FakeUser(id="user-1", username="alice", sub="alice")
    set_current_request_user(owner)

    assert manager.project_exists("novel-import") is False

    claimed = manager.claim_ownerless_project("novel-import", allowed_sources={"autonovel"})

    assert claimed is not None
    assert claimed["metadata"]["owner_user_id"] == "user-1"
    assert claimed["metadata"]["owner_username"] == "alice"
    assert manager.project_exists("novel-import") is True
    assert manager.load_project("novel-import")["title"] == "Imported"
