from __future__ import annotations

import mimetypes
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from lib.config.service import ConfigService
from server.auth import CurrentUser
from server.dependencies import get_config_service
from server.services.autonovel_workbench import (
    NovelWorkbenchError,
    get_novel_workbench_service,
)
from server.services.novel_writing_assistant import (
    NovelAssistantStage,
    NovelWritingAssistantError,
    generate_novel_assistant_chat,
    generate_novel_assistant_draft,
)

router = APIRouter()


class CreateNovelJobRequest(BaseModel):
    title: str
    seed_text: str
    project_name: str | None = None
    writing_language: str | None = None
    style: str | None = None
    aspect_ratio: Literal["9:16", "16:9"] | None = None
    default_duration: Literal[4, 6, 8] | None = None


class NovelAssistantDraftRequest(BaseModel):
    stage: NovelAssistantStage
    title: str = ""
    writing_language: str | None = None
    instruction: str = ""
    brief: dict[str, str] = Field(default_factory=dict)


class NovelAssistantChatMessagePayload(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class NovelAssistantChatRequest(BaseModel):
    stage: NovelAssistantStage
    title: str = ""
    writing_language: str | None = None
    message: str = Field(min_length=1)
    brief: dict[str, str] = Field(default_factory=dict)
    confirmed: dict[str, bool] = Field(default_factory=dict)
    messages: list[NovelAssistantChatMessagePayload] = Field(default_factory=list, max_length=32)


def _raise_http_error(exc: NovelWorkbenchError) -> None:
    detail = str(exc)
    status_code = 404 if "not found" in detail.lower() else 400
    raise HTTPException(status_code=status_code, detail=detail)


@router.get("/novel-workbench/status")
async def get_workbench_status(
    _user: CurrentUser,
    svc: ConfigService = Depends(get_config_service),
):
    runtime_env = await svc.build_novel_workbench_runtime_env()
    return get_novel_workbench_service().status_snapshot(runtime_env)


@router.get("/novel-workbench/jobs")
async def list_novel_jobs(_user: CurrentUser):
    jobs = await get_novel_workbench_service().list_jobs()
    return {"jobs": jobs}


@router.get("/novel-workbench/jobs/{job_id}")
async def get_novel_job(job_id: str, _user: CurrentUser):
    job = await get_novel_workbench_service().get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Novel job not found: {job_id}")
    return {"job": job}


@router.post("/novel-workbench/jobs")
async def create_novel_job(
    req: CreateNovelJobRequest,
    _user: CurrentUser,
    svc: ConfigService = Depends(get_config_service),
):
    try:
        runtime_env = await svc.build_novel_workbench_runtime_env()
        job = await get_novel_workbench_service().create_job(
            title=req.title,
            seed_text=req.seed_text,
            project_name=req.project_name,
            writing_language=req.writing_language,
            style=req.style,
            aspect_ratio=req.aspect_ratio,
            default_duration=req.default_duration,
            runtime_env=runtime_env,
            request_user=_user,
        )
    except NovelWorkbenchError as exc:
        _raise_http_error(exc)
    return {"success": True, "job": job}


@router.post("/novel-workbench/assistant/draft")
async def draft_novel_assistant_section(
    req: NovelAssistantDraftRequest,
    _user: CurrentUser,
    svc: ConfigService = Depends(get_config_service),
):
    runtime_env = await svc.build_novel_workbench_runtime_env()
    try:
        content = await generate_novel_assistant_draft(
            runtime_env=runtime_env,
            stage=req.stage,
            title=req.title,
            writing_language=req.writing_language or runtime_env.get("AUTONOVEL_WRITING_LANGUAGE", ""),
            instruction=req.instruction,
            brief=req.brief,
        )
    except NovelWritingAssistantError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"stage": req.stage, "content": content}


@router.post("/novel-workbench/assistant/chat")
async def chat_with_novel_assistant(
    req: NovelAssistantChatRequest,
    _user: CurrentUser,
    svc: ConfigService = Depends(get_config_service),
):
    runtime_env = await svc.build_novel_workbench_runtime_env()
    try:
        result = await generate_novel_assistant_chat(
            runtime_env=runtime_env,
            stage=req.stage,
            title=req.title,
            writing_language=req.writing_language or runtime_env.get("AUTONOVEL_WRITING_LANGUAGE", ""),
            message=req.message,
            brief=req.brief,
            confirmed=req.confirmed,
            messages=[message.model_dump() for message in req.messages],
        )
    except NovelWritingAssistantError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return result


@router.post("/novel-workbench/jobs/{job_id}/cancel")
async def cancel_novel_job(job_id: str, _user: CurrentUser):
    try:
        job = await get_novel_workbench_service().cancel_job(job_id)
    except NovelWorkbenchError as exc:
        _raise_http_error(exc)
    return {"success": True, "job": job}


@router.delete("/novel-workbench/jobs/{job_id}")
async def delete_novel_job(job_id: str, _user: CurrentUser):
    try:
        job = await get_novel_workbench_service().delete_job(job_id)
    except NovelWorkbenchError as exc:
        _raise_http_error(exc)
    return {"success": True, "job": job}


@router.get("/novel-workbench/jobs/{job_id}/artifacts")
async def list_novel_job_artifacts(job_id: str, _user: CurrentUser):
    try:
        return await get_novel_workbench_service().list_job_artifacts(job_id)
    except NovelWorkbenchError as exc:
        _raise_http_error(exc)


@router.get("/novel-workbench/jobs/{job_id}/artifacts/content")
async def get_novel_job_artifact_content(job_id: str, path: str, _user: CurrentUser):
    try:
        return await get_novel_workbench_service().read_job_artifact(job_id, path)
    except NovelWorkbenchError as exc:
        _raise_http_error(exc)


@router.get("/novel-workbench/jobs/{job_id}/artifacts/download")
async def download_novel_job_artifact(job_id: str, path: str, _user: CurrentUser):
    try:
        artifact_path = await get_novel_workbench_service().get_job_artifact_path(job_id, path)
    except NovelWorkbenchError as exc:
        _raise_http_error(exc)
    media_type = mimetypes.guess_type(artifact_path.name)[0] or "application/octet-stream"
    return FileResponse(
        artifact_path,
        media_type=media_type,
        filename=artifact_path.name,
    )


@router.get("/novel-workbench/jobs/{job_id}/log")
async def get_novel_job_log(job_id: str, _user: CurrentUser):
    try:
        return await get_novel_workbench_service().read_job_log(job_id)
    except NovelWorkbenchError as exc:
        _raise_http_error(exc)


@router.get("/novel-workbench/jobs/{job_id}/log/download")
async def download_novel_job_log(job_id: str, _user: CurrentUser):
    try:
        log_path = await get_novel_workbench_service().get_job_log_path(job_id)
    except NovelWorkbenchError as exc:
        _raise_http_error(exc)
    return FileResponse(
        log_path,
        media_type="text/plain; charset=utf-8",
        filename=log_path.name,
    )


@router.get("/novel-workbench/jobs/{job_id}/workspace/download")
async def download_novel_job_workspace(job_id: str, _user: CurrentUser):
    try:
        archive_path = await get_novel_workbench_service().get_job_workspace_archive_path(job_id)
    except NovelWorkbenchError as exc:
        _raise_http_error(exc)
    return FileResponse(
        archive_path,
        media_type="application/zip",
        filename=archive_path.name,
    )
