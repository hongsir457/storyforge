from __future__ import annotations

import asyncio
import json
import os
import shutil
import subprocess
import sys
import textwrap
import uuid
from collections.abc import Mapping
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from lib import PROJECT_ROOT
from lib.project_manager import ProjectManager


class NovelWorkbenchError(RuntimeError):
    pass


class NovelWorkbenchService:
    ACTIVE_STATUSES = {"queued", "running"}
    TERMINAL_STATUSES = {"succeeded", "failed", "cancelled"}
    PREVIEW_LIMIT_BYTES = 120_000
    AUTH_STATUS_KEY = "GEMINI_API_KEY"
    REQUIRED_RUNTIME_ENV = (
        "AUTONOVEL_WRITER_MODEL",
        "AUTONOVEL_JUDGE_MODEL",
        "AUTONOVEL_REVIEW_MODEL",
        "AUTONOVEL_API_BASE_URL",
    )
    RUNTIME_ENV_FILE_KEYS = (
        "GEMINI_API_KEY",
        "AUTONOVEL_WRITER_MODEL",
        "AUTONOVEL_JUDGE_MODEL",
        "AUTONOVEL_REVIEW_MODEL",
        "AUTONOVEL_API_BASE_URL",
    )
    OPTIONAL_RUNTIME_ENV = ("FAL_KEY", "ELEVENLABS_API_KEY")
    RUNTIME_ENV_DEFAULTS = {
        "AUTONOVEL_WRITER_MODEL": "gemini-3.1-pro-preview",
        "AUTONOVEL_JUDGE_MODEL": "gemini-3-flash-preview",
        "AUTONOVEL_REVIEW_MODEL": "gemini-3.1-pro-preview",
        "AUTONOVEL_API_BASE_URL": "https://generativelanguage.googleapis.com",
    }
    GENERATED_OUTPUT_NAMES = (
        "chapters",
        "typeset",
        "outline.md",
        "world.md",
        "characters.md",
        "canon.md",
        "state.json",
        "results.tsv",
        "seed.txt",
    )
    ARTIFACT_FILES = (
        ("inputs", "seed.txt"),
        ("planning", "program.md"),
        ("planning", "voice.md"),
        ("planning", "world.md"),
        ("planning", "characters.md"),
        ("planning", "canon.md"),
        ("planning", "outline.md"),
        ("planning", "state.json"),
        ("planning", "results.tsv"),
        ("export", "manuscript.md"),
        ("export", "typeset/novel.tex"),
        ("export", "typeset/novel.pdf"),
        ("export", "typeset/novel.epub"),
    )
    ARTIFACT_GLOBS = (("chapters", "chapters/ch_*.md"),)
    ARTIFACT_GROUP_ORDER = {
        "inputs": 0,
        "planning": 1,
        "chapters": 2,
        "export": 3,
    }
    PREVIEWABLE_EXTENSIONS = {".md", ".txt", ".json", ".yaml", ".yml", ".tex", ".tsv"}

    def __init__(self, project_root: Path):
        self.project_root = Path(project_root).resolve()
        self.projects_root = self.project_root / "projects"

        workspace_root_default = self.project_root
        self.workspace_root = Path(os.environ.get("NOVEL_WORKBENCH_ROOT", str(workspace_root_default))).resolve()
        self.autonovel_source_dir = Path(
            os.environ.get("AUTONOVEL_SOURCE_DIR", str(self.workspace_root / "autonovel"))
        ).resolve()
        self.importer_script = Path(
            os.environ.get(
                "AUTONOVEL_IMPORTER_SCRIPT", str(self.workspace_root / "tools" / "import_autonovel_to_autovedio.py")
            )
        ).resolve()

        shared_env = self.workspace_root / ".env.shared"
        default_env_source = shared_env if shared_env.exists() else self.autonovel_source_dir / ".env"
        self.autonovel_env_source = Path(os.environ.get("AUTONOVEL_ENV_SOURCE", str(default_env_source))).resolve()
        self.autonovel_env_example = self.autonovel_source_dir / ".env.example"

        self.state_dir = self.projects_root / ".novel_workbench"
        self.logs_dir = self.state_dir / "logs"
        self.workspaces_dir = self.state_dir / "workspaces"
        self.exports_dir = self.state_dir / "exports"
        self.jobs_file = self.state_dir / "jobs.json"

        self.pm = ProjectManager(self.projects_root)
        self._jobs: dict[str, dict[str, Any]] = {}
        self._tasks: dict[str, asyncio.Task[None]] = {}
        self._processes: dict[str, asyncio.subprocess.Process] = {}
        self._runtime_env_overrides: dict[str, dict[str, str]] = {}
        self._lock = asyncio.Lock()

    async def startup(self) -> None:
        self.state_dir.mkdir(parents=True, exist_ok=True)
        self.logs_dir.mkdir(parents=True, exist_ok=True)
        self.workspaces_dir.mkdir(parents=True, exist_ok=True)
        self.exports_dir.mkdir(parents=True, exist_ok=True)

        async with self._lock:
            self._load_jobs_locked()
            now = self._now()
            dirty = not self.jobs_file.exists()
            for job in self._jobs.values():
                if job.get("status") in self.ACTIVE_STATUSES:
                    job["status"] = "failed"
                    job["stage"] = "interrupted"
                    job["finished_at"] = now
                    job["updated_at"] = now
                    job["error_message"] = "Novel workbench service restarted while the job was running."
                    dirty = True
            if dirty:
                self._save_jobs_locked()

    async def shutdown(self) -> None:
        tasks = list(self._tasks.values())
        for task in tasks:
            task.cancel()
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

    def status_snapshot(self, runtime_env: Mapping[str, str] | None = None) -> dict[str, Any]:
        env_status = self._runtime_env_status(runtime_env)
        requirements = {
            "workspace_root_exists": self.workspace_root.exists(),
            "autonovel_repo_exists": self.autonovel_source_dir.exists(),
            "importer_exists": self.importer_script.exists(),
            "autonovel_env_exists": self._autonovel_env_ready(runtime_env),
            "git_available": shutil.which("git") is not None,
            "uv_available": shutil.which("uv") is not None,
        }
        requirements["all_ready"] = all(requirements.values())
        return {
            "workspace_root": str(self.workspace_root),
            "autonovel_source_dir": str(self.autonovel_source_dir),
            "importer_script": str(self.importer_script),
            "autonovel_env_source": str(self.autonovel_env_source),
            "autonovel_env_mode": self._autonovel_env_mode(runtime_env),
            "env_status": env_status,
            "requirements": requirements,
        }

    async def list_jobs(self) -> list[dict[str, Any]]:
        async with self._lock:
            jobs = [self._job_view(job) for job in self._jobs.values()]
        return sorted(jobs, key=lambda item: item.get("created_at", ""), reverse=True)

    async def get_job(self, job_id: str) -> dict[str, Any] | None:
        async with self._lock:
            job = self._jobs.get(job_id)
            return self._job_view(job) if job else None

    async def create_job(
        self,
        *,
        title: str,
        seed_text: str,
        project_name: str | None,
        style: str | None = None,
        aspect_ratio: str | None = None,
        default_duration: int | None = None,
        runtime_env: Mapping[str, str] | None = None,
    ) -> dict[str, Any]:
        title = title.strip()
        seed_text = seed_text.strip()
        style = (style or "").strip() or "Photographic"
        aspect_ratio = (aspect_ratio or "9:16").strip()
        default_duration = int(default_duration or 4)

        if not title:
            raise NovelWorkbenchError("Novel title cannot be empty.")
        if not seed_text:
            raise NovelWorkbenchError("Seed text cannot be empty.")
        if aspect_ratio not in {"9:16", "16:9"}:
            raise NovelWorkbenchError("Aspect ratio must be 9:16 or 16:9.")
        if default_duration not in {4, 6, 8}:
            raise NovelWorkbenchError("Default duration must be one of 4, 6, or 8 seconds.")

        async with self._lock:
            if project_name:
                target_project_name = self.pm.normalize_project_name(project_name)
            else:
                target_project_name = self.pm.generate_project_name(title)

            if (self.projects_root / target_project_name).exists():
                raise NovelWorkbenchError(f"Storyforge project already exists: {target_project_name}")

            for existing in self._jobs.values():
                if (
                    existing.get("target_project_name") == target_project_name
                    and existing.get("status") not in self.TERMINAL_STATUSES
                ):
                    raise NovelWorkbenchError(
                        f"Another novel job is already targeting project '{target_project_name}'."
                    )

            job_id = uuid.uuid4().hex[:12]
            now = self._now()
            workspace_dir = self.workspaces_dir / job_id
            log_path = self.logs_dir / f"{job_id}.log"
            job = {
                "job_id": job_id,
                "title": title,
                "seed_text": seed_text,
                "style": style,
                "aspect_ratio": aspect_ratio,
                "default_duration": default_duration,
                "target_project_name": target_project_name,
                "imported_project_name": None,
                "status": "queued",
                "stage": "queued",
                "error_message": None,
                "workspace_dir": str(workspace_dir),
                "log_path": str(log_path),
                "created_at": now,
                "updated_at": now,
                "started_at": None,
                "finished_at": None,
            }
            self._jobs[job_id] = job
            if runtime_env is not None:
                self._runtime_env_overrides[job_id] = dict(runtime_env)
            else:
                self._runtime_env_overrides.pop(job_id, None)
            self._save_jobs_locked()
            self._tasks[job_id] = asyncio.create_task(self._run_job(job_id), name=f"novel-workbench-{job_id}")
            return self._job_view(job)

    async def cancel_job(self, job_id: str) -> dict[str, Any]:
        async with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                raise NovelWorkbenchError(f"Novel job not found: {job_id}")
            if job.get("status") in self.TERMINAL_STATUSES:
                return self._job_view(job)
            job["status"] = "cancelled"
            job["stage"] = "cancelled"
            job["updated_at"] = self._now()
            job["finished_at"] = job.get("finished_at") or self._now()
            job["error_message"] = "Cancelled by user."
            self._save_jobs_locked()

            process = self._processes.get(job_id)
            task = self._tasks.get(job_id)

        if process and process.returncode is None:
            process.terminate()
        if task and not task.done():
            task.cancel()
        return await self.get_job(job_id) or {"job_id": job_id, "status": "cancelled"}

    async def delete_job(self, job_id: str) -> dict[str, Any]:
        async with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                raise NovelWorkbenchError(f"Novel job not found: {job_id}")
            if job.get("status") in self.ACTIVE_STATUSES:
                raise NovelWorkbenchError("Cancel the novel job before deleting its run record.")

            deleted_job = self._job_view(job)
            self._jobs.pop(job_id, None)
            self._runtime_env_overrides.pop(job_id, None)
            self._save_jobs_locked()

        workspace_dir = Path(job["workspace_dir"])
        log_path = Path(job["log_path"])
        if workspace_dir.exists():
            shutil.rmtree(workspace_dir, ignore_errors=True)
        log_path.unlink(missing_ok=True)
        archive_path = self.exports_dir / f"{job_id}-workspace.zip"
        archive_path.unlink(missing_ok=True)
        return deleted_job

    async def list_job_artifacts(self, job_id: str) -> dict[str, Any]:
        job = await self._get_raw_job(job_id)
        if not job:
            raise NovelWorkbenchError(f"Novel job not found: {job_id}")
        workspace_dir = Path(job["workspace_dir"])
        return self._build_artifact_listing(workspace_dir)

    async def read_job_artifact(self, job_id: str, relative_path: str) -> dict[str, Any]:
        path, artifact = await self._resolve_job_artifact(job_id, relative_path)
        if not artifact["previewable"]:
            raise NovelWorkbenchError(f"Artifact does not support inline preview: {relative_path}")
        content, truncated = self._read_text_preview(path)
        return {
            "artifact": artifact,
            "content": content,
            "truncated": truncated,
        }

    async def get_job_artifact_path(self, job_id: str, relative_path: str) -> Path:
        path, _artifact = await self._resolve_job_artifact(job_id, relative_path)
        return path

    async def read_job_log(self, job_id: str, limit: int = 250_000) -> dict[str, Any]:
        job = await self._get_raw_job(job_id)
        if not job:
            raise NovelWorkbenchError(f"Novel job not found: {job_id}")

        log_path = Path(job["log_path"]).resolve()
        if not log_path.is_file():
            raise NovelWorkbenchError(f"Novel job log is missing: {job_id}")

        with open(log_path, "rb") as handle:
            payload = handle.read(limit + 1)
        truncated = len(payload) > limit
        content = payload[:limit].decode("utf-8", errors="replace")
        stat = log_path.stat()
        return {
            "path": str(log_path),
            "content": content,
            "truncated": truncated,
            "size_bytes": stat.st_size,
            "modified_at": datetime.fromtimestamp(stat.st_mtime, UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
        }

    async def get_job_log_path(self, job_id: str) -> Path:
        job = await self._get_raw_job(job_id)
        if not job:
            raise NovelWorkbenchError(f"Novel job not found: {job_id}")

        log_path = Path(job["log_path"]).resolve()
        if not log_path.is_file():
            raise NovelWorkbenchError(f"Novel job log is missing: {job_id}")
        return log_path

    async def get_job_workspace_archive_path(self, job_id: str) -> Path:
        job = await self._get_raw_job(job_id)
        if not job:
            raise NovelWorkbenchError(f"Novel job not found: {job_id}")

        workspace_dir = Path(job["workspace_dir"]).resolve()
        if not workspace_dir.is_dir():
            raise NovelWorkbenchError(f"Novel workspace is missing: {job_id}")

        self.exports_dir.mkdir(parents=True, exist_ok=True)
        archive_path = self.exports_dir / f"{job_id}-workspace.zip"
        archive_path.unlink(missing_ok=True)
        shutil.make_archive(str(archive_path.with_suffix("")), "zip", root_dir=workspace_dir)
        return archive_path

    def _load_jobs_locked(self) -> None:
        if not self.jobs_file.exists():
            self._jobs = {}
            return
        with open(self.jobs_file, encoding="utf-8") as handle:
            payload = json.load(handle)
        jobs = payload if isinstance(payload, list) else []
        self._jobs = {
            str(job["job_id"]): job for job in jobs if isinstance(job, dict) and isinstance(job.get("job_id"), str)
        }

    def _save_jobs_locked(self) -> None:
        serializable = sorted(self._jobs.values(), key=lambda item: item.get("created_at", ""))
        with open(self.jobs_file, "w", encoding="utf-8") as handle:
            json.dump(serializable, handle, ensure_ascii=False, indent=2)

    def _job_view(self, job: dict[str, Any] | None) -> dict[str, Any]:
        if job is None:
            return {}
        view = dict(job)
        view["seed_excerpt"] = textwrap.shorten(
            " ".join(view.get("seed_text", "").split()), width=180, placeholder="..."
        )
        log_path = Path(view.get("log_path") or "")
        view["log_tail"] = self._read_log_tail(log_path)
        return view

    def _read_log_tail(self, path: Path, limit: int = 20000) -> str:
        if not path.exists():
            return ""
        with open(path, "rb") as handle:
            handle.seek(0, os.SEEK_END)
            size = handle.tell()
            handle.seek(max(0, size - limit))
            payload = handle.read().decode("utf-8", errors="replace")
        return payload[-limit:]

    def _build_artifact_listing(self, workspace_dir: Path) -> dict[str, Any]:
        artifacts: list[dict[str, Any]] = []
        seen: set[str] = set()

        for group, relative_path in self.ARTIFACT_FILES:
            path = workspace_dir / relative_path
            if path.is_file():
                artifact = self._artifact_view(workspace_dir, path, group)
                artifacts.append(artifact)
                seen.add(artifact["path"])

        for group, pattern in self.ARTIFACT_GLOBS:
            for path in sorted(workspace_dir.glob(pattern)):
                if not path.is_file():
                    continue
                artifact = self._artifact_view(workspace_dir, path, group)
                if artifact["path"] in seen:
                    continue
                artifacts.append(artifact)
                seen.add(artifact["path"])

        artifacts.sort(key=lambda item: (self.ARTIFACT_GROUP_ORDER.get(item["group"], 999), item["path"]))
        return {
            "summary": self._artifact_summary(seen),
            "artifacts": artifacts,
        }

    def _artifact_summary(self, paths: set[str]) -> dict[str, Any]:
        return {
            "available_count": len(paths),
            "chapter_count": sum(1 for path in paths if path.startswith("chapters/")),
            "has_seed": "seed.txt" in paths,
            "has_outline": "outline.md" in paths,
            "has_world": "world.md" in paths,
            "has_characters": "characters.md" in paths,
            "has_canon": "canon.md" in paths,
            "has_state": "state.json" in paths,
            "has_manuscript": "manuscript.md" in paths,
            "has_pdf": "typeset/novel.pdf" in paths,
        }

    def _artifact_view(self, workspace_dir: Path, path: Path, group: str) -> dict[str, Any]:
        relative_path = path.relative_to(workspace_dir).as_posix()
        stat = path.stat()
        kind = self._artifact_kind(path)
        return {
            "path": relative_path,
            "label": self._artifact_label(relative_path),
            "group": group,
            "kind": kind,
            "previewable": kind in {"markdown", "text", "json"},
            "size_bytes": stat.st_size,
            "modified_at": datetime.fromtimestamp(stat.st_mtime, UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
        }

    def _artifact_label(self, relative_path: str) -> str:
        if relative_path.startswith("chapters/ch_"):
            chapter_id = Path(relative_path).stem.removeprefix("ch_")
            if chapter_id.isdigit():
                return f"Chapter {int(chapter_id):02d}"
        labels = {
            "seed.txt": "Seed",
            "program.md": "Program",
            "voice.md": "Voice",
            "world.md": "World",
            "characters.md": "Characters",
            "canon.md": "Canon",
            "outline.md": "Outline",
            "state.json": "State",
            "results.tsv": "Results",
            "manuscript.md": "Manuscript",
            "typeset/novel.tex": "Typeset LaTeX",
            "typeset/novel.pdf": "Typeset PDF",
            "typeset/novel.epub": "ePub",
        }
        return labels.get(relative_path, Path(relative_path).name)

    def _artifact_kind(self, path: Path) -> str:
        suffix = path.suffix.lower()
        if suffix == ".md":
            return "markdown"
        if suffix == ".json":
            return "json"
        if suffix == ".pdf":
            return "pdf"
        if suffix == ".epub":
            return "epub"
        if suffix in self.PREVIEWABLE_EXTENSIONS:
            return "text"
        return "binary"

    def _read_text_preview(self, path: Path) -> tuple[str, bool]:
        with open(path, "rb") as handle:
            payload = handle.read(self.PREVIEW_LIMIT_BYTES + 1)
        truncated = len(payload) > self.PREVIEW_LIMIT_BYTES
        content = payload[: self.PREVIEW_LIMIT_BYTES].decode("utf-8", errors="replace")
        return content, truncated

    async def _resolve_job_artifact(self, job_id: str, relative_path: str) -> tuple[Path, dict[str, Any]]:
        relative_path = (relative_path or "").strip().replace("\\", "/")
        if not relative_path:
            raise NovelWorkbenchError("Artifact path cannot be empty.")

        job = await self._get_raw_job(job_id)
        if not job:
            raise NovelWorkbenchError(f"Novel job not found: {job_id}")

        workspace_dir = Path(job["workspace_dir"]).resolve()
        listing = self._build_artifact_listing(workspace_dir)
        artifact_lookup = {artifact["path"]: artifact for artifact in listing["artifacts"]}
        artifact = artifact_lookup.get(relative_path)
        if not artifact:
            raise NovelWorkbenchError(f"Novel artifact not found: {relative_path}")

        path = (workspace_dir / relative_path).resolve()
        if workspace_dir not in path.parents:
            raise NovelWorkbenchError(f"Artifact path escapes workspace: {relative_path}")
        if not path.is_file():
            raise NovelWorkbenchError(f"Novel artifact file is missing: {relative_path}")
        return path, artifact

    async def _run_job(self, job_id: str) -> None:
        try:
            await self._mark_job(
                job_id, status="running", stage="preparing", started_at=self._now(), error_message=None
            )
            runtime_env = self._runtime_env_overrides.get(job_id)
            self._assert_ready(runtime_env)

            job = await self._get_raw_job(job_id)
            if job is None:
                raise NovelWorkbenchError(f"Novel job disappeared: {job_id}")

            workspace_dir = Path(job["workspace_dir"])
            log_path = Path(job["log_path"])
            await self._prepare_workspace(job, workspace_dir, runtime_env)
            await self._run_command(
                job_id,
                ["uv", "sync"],
                cwd=workspace_dir,
                log_path=log_path,
                stage="syncing",
                runtime_env=runtime_env,
            )
            await self._run_command(
                job_id,
                ["uv", "run", "python", "run_pipeline.py", "--from-scratch"],
                cwd=workspace_dir,
                log_path=log_path,
                stage="pipeline",
                runtime_env=runtime_env,
            )
            await self._run_command(
                job_id,
                [
                    sys.executable,
                    str(self.importer_script),
                    "--autonovel-dir",
                    str(workspace_dir),
                    "--autovedio-dir",
                    str(self.project_root),
                    "--project-name",
                    str(job["target_project_name"]),
                    "--project-title",
                    str(job["title"]),
                    "--style",
                    str(job["style"]),
                    "--aspect-ratio",
                    str(job["aspect_ratio"]),
                    "--default-duration",
                    str(job["default_duration"]),
                ],
                cwd=self.workspace_root,
                log_path=log_path,
                stage="importing",
                runtime_env=runtime_env,
            )
            await self._mark_job(
                job_id,
                status="succeeded",
                stage="completed",
                imported_project_name=str(job["target_project_name"]),
                finished_at=self._now(),
            )
        except asyncio.CancelledError:
            process = self._processes.get(job_id)
            if process and process.returncode is None:
                process.terminate()
                try:
                    await asyncio.wait_for(process.wait(), timeout=10)
                except TimeoutError:
                    process.kill()
                    await process.wait()
            await self._mark_job(
                job_id,
                status="cancelled",
                stage="cancelled",
                finished_at=self._now(),
                error_message="Cancelled by user.",
            )
        except Exception as exc:
            await self._mark_job(
                job_id,
                status="failed",
                stage="failed",
                finished_at=self._now(),
                error_message=str(exc),
            )
        finally:
            self._processes.pop(job_id, None)
            self._tasks.pop(job_id, None)
            self._runtime_env_overrides.pop(job_id, None)

    async def _prepare_workspace(
        self,
        job: dict[str, Any],
        workspace_dir: Path,
        runtime_env: Mapping[str, str] | None = None,
    ) -> None:
        if workspace_dir.exists():
            shutil.rmtree(workspace_dir, ignore_errors=True)
        workspace_dir.parent.mkdir(parents=True, exist_ok=True)
        if (self.autonovel_source_dir / ".git").exists():
            await self._run_command(
                str(job["job_id"]),
                ["git", "clone", "--depth", "1", str(self.autonovel_source_dir), str(workspace_dir)],
                cwd=self.workspace_root,
                log_path=Path(job["log_path"]),
                stage="preparing",
            )
        else:
            shutil.copytree(
                self.autonovel_source_dir,
                workspace_dir,
                ignore=shutil.ignore_patterns(".git", ".venv", "__pycache__", ".pytest_cache", ".env"),
            )
        self._reset_workspace_outputs(workspace_dir)
        self._materialize_autonovel_env(workspace_dir, runtime_env)
        (workspace_dir / "seed.txt").write_text(str(job["seed_text"]).strip() + "\n", encoding="utf-8")
        self._initialize_workspace_git_repo(workspace_dir)

    async def _run_command(
        self,
        job_id: str,
        command: list[str],
        *,
        cwd: Path,
        log_path: Path,
        stage: str,
        runtime_env: Mapping[str, str] | None = None,
    ) -> None:
        await self._mark_job(job_id, stage=stage)
        env = os.environ.copy()
        env.setdefault("PYTHONUTF8", "1")
        env.setdefault("UV_LINK_MODE", "copy")
        env.pop("VIRTUAL_ENV", None)
        if runtime_env:
            env.update({key: str(value).strip() for key, value in runtime_env.items()})

        log_path.parent.mkdir(parents=True, exist_ok=True)
        with open(log_path, "a", encoding="utf-8") as log_handle:
            log_handle.write(f"\n[{self._now()}] $ {' '.join(command)}\n")
            log_handle.flush()

            process = await asyncio.create_subprocess_exec(
                *command,
                cwd=str(cwd),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
                env=env,
            )
            self._processes[job_id] = process

            assert process.stdout is not None
            while True:
                line = await process.stdout.readline()
                if not line:
                    break
                log_handle.write(line.decode("utf-8", errors="replace"))
                log_handle.flush()

            returncode = await process.wait()

        if returncode != 0:
            raise NovelWorkbenchError(f"Command failed with exit code {returncode}: {' '.join(command)}")

    def _assert_ready(self, runtime_env: Mapping[str, str] | None = None) -> None:
        status = self.status_snapshot(runtime_env)
        missing = [key for key, value in status["requirements"].items() if key != "all_ready" and not value]
        if missing:
            raise NovelWorkbenchError("Novel workbench is not ready: " + ", ".join(missing))

    def _autonovel_env_ready(self, runtime_env: Mapping[str, str] | None = None) -> bool:
        if runtime_env is not None:
            return not self._runtime_env_status(runtime_env)["missing_required"]
        return self.autonovel_env_source.exists() or not self._runtime_env_status()["missing_required"]

    def _autonovel_env_mode(self, runtime_env: Mapping[str, str] | None = None) -> str:
        if runtime_env is not None:
            if self._autonovel_env_ready(runtime_env):
                return "generated"
            return "missing"
        if self.autonovel_env_source.exists():
            return "file"
        if self._autonovel_env_ready():
            return "generated"
        return "missing"

    def _runtime_env_status(self, runtime_env: Mapping[str, str] | None = None) -> dict[str, Any]:
        values = self._collect_runtime_env_values(runtime_env)
        required = {
            self.AUTH_STATUS_KEY: self._runtime_auth_ready(values),
            **{key: bool(values.get(key, "").strip()) for key in self.REQUIRED_RUNTIME_ENV},
        }
        optional = {key: bool(values.get(key, "").strip()) for key in self.OPTIONAL_RUNTIME_ENV}
        return {
            "required": required,
            "optional": optional,
            "missing_required": [key for key, ok in required.items() if not ok],
            "missing_optional": [key for key, ok in optional.items() if not ok],
        }

    def _collect_runtime_env_values(self, runtime_env: Mapping[str, str] | None = None) -> dict[str, str]:
        api_key = (os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY") or "").strip()
        api_base_url = (
            os.environ.get("AUTONOVEL_API_BASE_URL")
            or os.environ.get("GEMINI_BASE_URL")
            or self.RUNTIME_ENV_DEFAULTS["AUTONOVEL_API_BASE_URL"]
        ).strip()

        values = {
            "GEMINI_API_KEY": api_key,
            "AUTONOVEL_WRITER_MODEL": (
                os.environ.get("AUTONOVEL_WRITER_MODEL") or self.RUNTIME_ENV_DEFAULTS["AUTONOVEL_WRITER_MODEL"]
            ).strip(),
            "AUTONOVEL_JUDGE_MODEL": (
                os.environ.get("AUTONOVEL_JUDGE_MODEL") or self.RUNTIME_ENV_DEFAULTS["AUTONOVEL_JUDGE_MODEL"]
            ).strip(),
            "AUTONOVEL_REVIEW_MODEL": (
                os.environ.get("AUTONOVEL_REVIEW_MODEL") or self.RUNTIME_ENV_DEFAULTS["AUTONOVEL_REVIEW_MODEL"]
            ).strip(),
            "AUTONOVEL_API_BASE_URL": api_base_url,
            "FAL_KEY": os.environ.get("FAL_KEY", "").strip(),
            "ELEVENLABS_API_KEY": os.environ.get("ELEVENLABS_API_KEY", "").strip(),
        }
        if runtime_env:
            for key, value in runtime_env.items():
                values[key] = str(value).strip()
        return values

    def _runtime_auth_ready(self, values: dict[str, str]) -> bool:
        return bool(values.get("GEMINI_API_KEY", "").strip())

    def _materialize_autonovel_env(self, workspace_dir: Path, runtime_env: Mapping[str, str] | None = None) -> None:
        destination = workspace_dir / ".env"
        if runtime_env is not None:
            destination.write_text(self._render_runtime_env(runtime_env), encoding="utf-8")
            return
        if self.autonovel_env_source.exists():
            shutil.copyfile(self.autonovel_env_source, destination)
            return
        destination.write_text(self._render_runtime_env(), encoding="utf-8")

    def _render_runtime_env(self, runtime_env: Mapping[str, str] | None = None) -> str:
        values = self._collect_runtime_env_values(runtime_env)
        missing_required: list[str] = []
        if not self._runtime_auth_ready(values):
            missing_required.append(self.AUTH_STATUS_KEY)
        missing_required.extend(key for key in self.REQUIRED_RUNTIME_ENV if not values.get(key, "").strip())
        if missing_required:
            raise NovelWorkbenchError("Novel workbench is missing required runtime env: " + ", ".join(missing_required))

        ordered_keys = list(self.RUNTIME_ENV_FILE_KEYS) + list(self.OPTIONAL_RUNTIME_ENV)
        if self.autonovel_env_example.exists():
            lines: list[str] = []
            seen: set[str] = set()
            for raw_line in self.autonovel_env_example.read_text(encoding="utf-8").splitlines():
                if not raw_line or raw_line.lstrip().startswith("#") or "=" not in raw_line:
                    lines.append(raw_line)
                    continue
                key, _sep, _value = raw_line.partition("=")
                key = key.strip()
                if key in values:
                    lines.append(f"{key}={values[key]}")
                    seen.add(key)
                else:
                    lines.append(raw_line)
            for key in ordered_keys:
                if key not in seen:
                    lines.append(f"{key}={values.get(key, '')}")
            return "\n".join(lines).rstrip() + "\n"

        return "\n".join(f"{key}={values.get(key, '')}" for key in ordered_keys) + "\n"

    async def _get_raw_job(self, job_id: str) -> dict[str, Any] | None:
        async with self._lock:
            return dict(self._jobs[job_id]) if job_id in self._jobs else None

    async def _mark_job(self, job_id: str, **updates: Any) -> None:
        async with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return
            job.update(updates)
            job["updated_at"] = self._now()
            self._save_jobs_locked()

    def _reset_workspace_outputs(self, workspace_dir: Path) -> None:
        for name in self.GENERATED_OUTPUT_NAMES:
            path = workspace_dir / name
            if path.is_dir():
                shutil.rmtree(path, ignore_errors=True)
            elif path.exists():
                path.unlink(missing_ok=True)

    def _initialize_workspace_git_repo(self, workspace_dir: Path) -> None:
        if (workspace_dir / ".git").exists():
            return

        commands = (
            ["git", "init"],
            ["git", "config", "user.name", "Storyforge Autonovel"],
            ["git", "config", "user.email", "noreply@storyforge.local"],
            ["git", "add", "-A"],
            ["git", "commit", "-m", "workspace bootstrap", "--allow-empty"],
        )
        for command in commands:
            result = subprocess.run(
                command,
                cwd=workspace_dir,
                capture_output=True,
                text=True,
                check=False,
            )
            if result.returncode != 0:
                raise NovelWorkbenchError(
                    f"Failed to initialize autonovel workspace git repo: {' '.join(command)}: {result.stderr.strip()}"
                )

    def _now(self) -> str:
        return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


novel_workbench_service = NovelWorkbenchService(PROJECT_ROOT)


def get_novel_workbench_service() -> NovelWorkbenchService:
    return novel_workbench_service
