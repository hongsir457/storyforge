"""
Frametale FastAPI application.

Run locally:
    cd frametale
    uv run uvicorn server.app:app --reload --port 1241
"""

import asyncio
import html
import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.requests import Request
from starlette.responses import HTMLResponse, PlainTextResponse, Response

from lib import PROJECT_ROOT
from lib.db import async_session_factory, close_db, init_db
from lib.generation_worker import GenerationWorker
from lib.logging_config import setup_logging
from server.auth import ensure_auth_password, ensure_bootstrap_admin
from server.routers import (
    agent_chat,
    api_keys,
    assistant,
    autonovel_workbench,
    billing,
    characters,
    clues,
    cost_estimation,
    custom_providers,
    files,
    generate,
    grids,
    project_events,
    projects,
    providers,
    system_config,
    tasks,
    usage,
    versions,
)
from server.routers import (
    auth as auth_router,
)
from server.services.autonovel_workbench import NovelWorkbenchError, get_novel_workbench_service
from server.services.project_events import ProjectEventService

setup_logging()
logger = logging.getLogger(__name__)


def create_generation_worker() -> GenerationWorker:
    return GenerationWorker()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application startup and shutdown."""
    ensure_auth_password()

    await init_db()
    await ensure_bootstrap_admin()

    try:
        from lib.config.migration import migrate_json_to_db

        json_path = PROJECT_ROOT / "projects" / ".system_config.json"
        async with async_session_factory() as session:
            await migrate_json_to_db(session, json_path)
    except Exception as exc:
        logger.warning("JSON->DB config migration failed (non-fatal): %s", exc)

    try:
        from lib.config.service import ConfigService, sync_anthropic_env

        async with async_session_factory() as session:
            svc = ConfigService(session)
            all_settings = await svc.get_all_settings()
            sync_anthropic_env(all_settings)
    except Exception as exc:
        logger.warning("DB->env Anthropic config sync failed (non-fatal): %s", exc)

    try:
        from lib.project_manager import ProjectManager

        project_manager = ProjectManager(PROJECT_ROOT / "projects")
        symlink_stats = project_manager.repair_all_symlinks()
        if any(value > 0 for value in symlink_stats.values()):
            logger.info("agent_runtime symlink repair completed: %s", symlink_stats)
    except Exception as exc:
        logger.warning("Project symlink repair failed (non-fatal): %s", exc)

    await assistant.assistant_service.startup()
    assistant.assistant_service.session_manager.start_patrol()

    logger.info("Starting GenerationWorker...")
    worker = create_generation_worker()
    app.state.generation_worker = worker
    await worker.start()
    logger.info("GenerationWorker started")

    logger.info("Starting ProjectEventService...")
    project_event_service = ProjectEventService(PROJECT_ROOT)
    app.state.project_event_service = project_event_service
    await project_event_service.start()
    logger.info("ProjectEventService started")

    logger.info("Starting NovelWorkbenchService...")
    novel_workbench_service = get_novel_workbench_service()
    app.state.novel_workbench_service = novel_workbench_service
    await novel_workbench_service.startup()
    logger.info("NovelWorkbenchService started")

    yield

    novel_workbench_service = getattr(app.state, "novel_workbench_service", None)
    if novel_workbench_service:
        logger.info("Stopping NovelWorkbenchService...")
        await novel_workbench_service.shutdown()
        logger.info("NovelWorkbenchService stopped")

    project_event_service = getattr(app.state, "project_event_service", None)
    if project_event_service:
        logger.info("Stopping ProjectEventService...")
        await project_event_service.shutdown()
        logger.info("ProjectEventService stopped")

    worker = getattr(app.state, "generation_worker", None)
    if worker:
        logger.info("Stopping GenerationWorker...")
        await worker.stop()
        logger.info("GenerationWorker stopped")

    await close_db()


app = FastAPI(
    title="Frametale",
    description="AI novel and video studio",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    start = time.perf_counter()
    path = request.url.path
    skip_log = path.startswith("/assets") or path == "/health"
    try:
        response: Response = await call_next(request)
    except Exception:
        if not skip_log:
            elapsed_ms = (time.perf_counter() - start) * 1000
            logger.exception(
                "%s %s 500 %.0fms (unhandled)",
                request.method,
                path,
                elapsed_ms,
            )
        raise
    if not skip_log:
        elapsed_ms = (time.perf_counter() - start) * 1000
        logger.info(
            "%s %s %d %.0fms",
            request.method,
            path,
            response.status_code,
            elapsed_ms,
        )
    return response


app.include_router(auth_router.router, prefix="/api/v1", tags=["Authentication"])
app.include_router(projects.router, prefix="/api/v1", tags=["Projects"])
app.include_router(characters.router, prefix="/api/v1", tags=["Characters"])
app.include_router(clues.router, prefix="/api/v1", tags=["Clues"])
app.include_router(files.router, prefix="/api/v1", tags=["Files"])
app.include_router(generate.router, prefix="/api/v1", tags=["Generation"])
app.include_router(versions.router, prefix="/api/v1", tags=["Versions"])
app.include_router(usage.router, prefix="/api/v1", tags=["Usage"])
app.include_router(billing.router, prefix="/api/v1", tags=["Billing"])
app.include_router(assistant.router, prefix="/api/v1/projects/{project_name}/assistant", tags=["Assistant"])
app.include_router(tasks.router, prefix="/api/v1", tags=["Tasks"])
app.include_router(project_events.router, prefix="/api/v1", tags=["Project Events"])
app.include_router(providers.router, prefix="/api/v1", tags=["Providers"])
app.include_router(system_config.router, prefix="/api/v1", tags=["System Config"])
app.include_router(api_keys.router, prefix="/api/v1", tags=["API Keys"])
app.include_router(agent_chat.router, prefix="/api/v1", tags=["Agent Chat"])
app.include_router(custom_providers.router, prefix="/api/v1", tags=["Custom Providers"])
app.include_router(cost_estimation.router, prefix="/api/v1", tags=["Cost Estimation"])
app.include_router(grids.router, prefix="/api/v1", tags=["Grids"])
app.include_router(autonovel_workbench.router, prefix="/api/v1", tags=["Novel Workbench"])


@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "Frametale is running"}


@app.get("/skill.md", include_in_schema=False)
async def serve_skill_md(request: Request) -> Response:
    """Render the public skill template with the request base URL."""
    template_path = PROJECT_ROOT / "public" / "skill.md.template"

    def _read() -> tuple[bool, str]:
        if not template_path.exists():
            return False, ""
        return True, template_path.read_text(encoding="utf-8")

    exists, template = await asyncio.to_thread(_read)
    if not exists:
        return PlainTextResponse("skill.md template not found", status_code=404)

    forwarded_proto = request.headers.get("x-forwarded-proto")
    scheme = forwarded_proto or request.url.scheme or "http"
    host = request.url.netloc
    base_url = f"{scheme}://{host}"

    content = template.replace("{{BASE_URL}}", base_url)
    return PlainTextResponse(content, media_type="text/markdown; charset=utf-8")


def _render_novel_share_error(title: str, detail: str) -> str:
    safe_title = html.escape(title)
    safe_detail = html.escape(detail)
    return f"""<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{safe_title}</title>
  <style>
    :root {{ color-scheme: light; }}
    body {{
      margin: 0;
      background: #f7f8fb;
      color: #172645;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }}
    main {{
      box-sizing: border-box;
      max-width: 760px;
      min-height: 100vh;
      margin: 0 auto;
      padding: 28px 20px;
    }}
    .panel {{
      border: 1px solid #d9e0ea;
      border-radius: 14px;
      background: #fff;
      padding: 22px;
    }}
    h1 {{ margin: 0 0 12px; font-size: 22px; line-height: 1.3; }}
    p {{ margin: 0; color: #526173; line-height: 1.7; }}
  </style>
</head>
<body>
  <main>
    <section class="panel">
      <h1>{safe_title}</h1>
      <p>{safe_detail}</p>
    </section>
  </main>
</body>
</html>"""


def _render_novel_share_page(payload: dict) -> str:
    job = payload.get("job") or {}
    artifact = payload.get("artifact") or {}
    job_title = str(job.get("title") or "Novel")
    artifact_label = str(artifact.get("label") or artifact.get("path") or "Artifact")
    artifact_path = str(artifact.get("path") or "")
    modified_at = str(artifact.get("modified_at") or job.get("finished_at") or job.get("updated_at") or "")
    page_title = f"{artifact_label} - {job_title}"
    safe_page_title = html.escape(page_title)
    safe_job_title = html.escape(job_title)
    safe_artifact_label = html.escape(artifact_label)
    safe_artifact_path = html.escape(artifact_path)
    safe_modified_at = html.escape(modified_at)
    safe_content = html.escape(str(payload.get("content") or ""), quote=False)
    truncated_notice = (
        '<div class="notice">This shared preview was truncated. Download the original artifact in Frametale for the full file.</div>'
        if payload.get("truncated")
        else ""
    )

    return f"""<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="format-detection" content="telephone=no,email=no,address=no">
  <title>{safe_page_title}</title>
  <meta property="og:title" content="{safe_page_title}">
  <meta property="og:site_name" content="Frametale">
  <meta property="og:type" content="article">
  <style>
    :root {{ color-scheme: light; }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      background: #f7f8fb;
      color: #172645;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    }}
    main {{
      width: min(100%, 920px);
      margin: 0 auto;
      padding: 22px 16px 40px;
    }}
    header {{
      border-bottom: 1px solid #d9e0ea;
      padding: 8px 0 18px;
    }}
    .brand {{
      color: #526173;
      font-size: 13px;
      letter-spacing: 0;
    }}
    h1 {{
      margin: 12px 0 8px;
      font-size: clamp(24px, 6vw, 36px);
      line-height: 1.25;
      letter-spacing: 0;
    }}
    .meta {{
      color: #526173;
      font-size: 13px;
      line-height: 1.7;
      word-break: break-word;
    }}
    .content {{
      margin-top: 22px;
      border: 1px solid #d9e0ea;
      border-radius: 12px;
      background: #fff;
      padding: 18px;
    }}
    pre {{
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
      overflow-wrap: anywhere;
      font: 16px/1.9 -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
      color: #172645;
    }}
    .notice {{
      margin-top: 14px;
      border: 1px solid #f2c94c;
      border-radius: 10px;
      background: #fff9db;
      color: #6f5500;
      padding: 10px 12px;
      font-size: 13px;
      line-height: 1.6;
    }}
    @media (max-width: 640px) {{
      main {{ padding: 18px 12px 32px; }}
      .content {{ padding: 14px; }}
      pre {{ font-size: 15px; line-height: 1.85; }}
    }}
  </style>
</head>
<body>
  <main>
    <header>
      <div class="brand">Frametale shared novel text</div>
      <h1>{safe_artifact_label}</h1>
      <div class="meta">{safe_job_title}</div>
      <div class="meta">{safe_artifact_path}{(" · " + safe_modified_at) if safe_modified_at else ""}</div>
    </header>
    <section class="content">
      <pre>{safe_content}</pre>
      {truncated_notice}
    </section>
  </main>
</body>
</html>"""


@app.get("/share/novel", include_in_schema=False)
async def serve_novel_artifact_share(job: str = "", artifact: str | None = None, path: str | None = None) -> Response:
    job_id = job.strip()
    artifact_path = (artifact or path or "").strip()
    if not job_id or not artifact_path:
        return HTMLResponse(
            _render_novel_share_error(
                "Novel share link is incomplete.", "The link is missing its job or artifact value."
            ),
            status_code=400,
        )

    try:
        payload = await get_novel_workbench_service().read_public_job_artifact(job_id, artifact_path)
    except NovelWorkbenchError as exc:
        return HTMLResponse(
            _render_novel_share_error("Novel share is unavailable.", str(exc)),
            status_code=404,
        )

    return HTMLResponse(
        _render_novel_share_page(payload),
        headers={"Cache-Control": "public, max-age=60"},
    )


frontend_dist_dir = PROJECT_ROOT / "frontend" / "dist"


class SPAStaticFiles(StaticFiles):
    """Serve the Vite build output and fall back to index.html for SPA routes."""

    async def get_response(self, path: str, scope):
        try:
            return await super().get_response(path, scope)
        except StarletteHTTPException as exc:
            if exc.status_code == 404:
                return await super().get_response("index.html", scope)
            raise


if frontend_dist_dir.exists():
    app.mount("/", SPAStaticFiles(directory=frontend_dist_dir, html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=1241, reload=True)
