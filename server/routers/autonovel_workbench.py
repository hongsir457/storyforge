from __future__ import annotations

import mimetypes
from typing import Literal

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from server.auth import CurrentUser
from server.services.autonovel_workbench import (
    NovelWorkbenchError,
    get_novel_workbench_service,
)

router = APIRouter()


class CreateNovelJobRequest(BaseModel):
    title: str
    seed_text: str
    project_name: str | None = None
    style: str | None = None
    aspect_ratio: Literal["9:16", "16:9"] | None = None
    default_duration: Literal[4, 6, 8] | None = None


def _raise_http_error(exc: NovelWorkbenchError) -> None:
    detail = str(exc)
    status_code = 404 if "not found" in detail.lower() else 400
    raise HTTPException(status_code=status_code, detail=detail)


@router.get("/novel-workbench/status")
async def get_workbench_status(_user: CurrentUser):
    return get_novel_workbench_service().status_snapshot()


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
async def create_novel_job(req: CreateNovelJobRequest, _user: CurrentUser):
    try:
        job = await get_novel_workbench_service().create_job(
            title=req.title,
            seed_text=req.seed_text,
            project_name=req.project_name,
            style=req.style,
            aspect_ratio=req.aspect_ratio,
            default_duration=req.default_duration,
        )
    except NovelWorkbenchError as exc:
        _raise_http_error(exc)
    return {"success": True, "job": job}


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
