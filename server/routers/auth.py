"""Authentication APIs for login, registration, verification, and profile management."""

from __future__ import annotations

import logging
from html import escape
from typing import Annotated, Literal
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from lib.db import get_async_session
from lib.db.base import DEFAULT_USER_ID
from lib.db.models.user import User
from lib.db.repositories.user_repository import UserRepository
from lib.i18n import Translator
from server.auth import (
    CurrentUser,
    create_token,
    hash_password,
    verify_password,
)
from server.services.auth_challenge_store import (
    ChallengeKind,
    ChallengeRateLimitedError,
    PendingRegistration,
    get_auth_challenge_store,
)
from server.services.mailer import get_mailer_config, send_email

logger = logging.getLogger(__name__)

router = APIRouter()
EmailDeliveryStatus = Literal["sent", "debug_logged", "unavailable", "failed"]


class AuthenticatedUserResponse(BaseModel):
    id: str
    username: str
    email: str | None = None
    display_name: str
    role: str
    is_active: bool
    is_email_verified: bool


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: AuthenticatedUserResponse


class VerifyResponse(BaseModel):
    valid: bool
    username: str
    email: str | None = None
    role: str
    is_email_verified: bool


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=32)
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    display_name: str | None = Field(default=None, max_length=64)


class RegisterResponse(BaseModel):
    success: bool
    email: str
    verification_required: bool
    email_delivery: EmailDeliveryStatus


class EmailRequest(BaseModel):
    email: str = Field(min_length=5, max_length=255)


class VerifyEmailConfirmRequest(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    code: str = Field(min_length=4, max_length=12)


class PasswordResetRequest(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    code: str = Field(min_length=4, max_length=12)
    new_password: str = Field(min_length=8, max_length=128)


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class UpdateProfileRequest(BaseModel):
    display_name: str = Field(min_length=1, max_length=64)


class GenericSuccessResponse(BaseModel):
    success: bool
    message: str | None = None
    email_delivery: EmailDeliveryStatus | None = None


def _normalize_email(email: str) -> str:
    normalized = email.strip().lower()
    if "@" not in normalized or "." not in normalized.split("@", 1)[1]:
        raise HTTPException(status_code=422, detail="invalid email address")
    return normalized


def _normalize_username(username: str) -> str:
    normalized = username.strip()
    if not normalized:
        raise HTTPException(status_code=422, detail="username is required")
    if not normalized.replace("_", "").replace("-", "").isalnum():
        raise HTTPException(status_code=422, detail="username can only contain letters, numbers, _ and -")
    return normalized


def _public_base_url(request: Request) -> str:
    return str(request.base_url).rstrip("/")


def _build_auth_email_bodies(
    *,
    kind: ChallengeKind,
    subject: str,
    text_body: str,
    email: str,
    display_name: str,
    code: str,
    request: Request,
) -> tuple[str, str]:
    base_url = _public_base_url(request)
    logo_url = f"{base_url}/storyforge-logo.png"
    if kind == "verify_email":
        headline = "验证你的 Storyforge 账号"
        description = "请使用下面的 6 位验证码完成邮箱验证。验证码 15 分钟内有效。"
        action_label = "打开验证页面"
        action_url = f"{base_url}/verify-email?email={quote(email)}"
    else:
        headline = "重置你的 Storyforge 密码"
        description = "请使用下面的 6 位验证码完成密码重置。验证码 15 分钟内有效。"
        action_label = "打开重置页面"
        action_url = f"{base_url}/forgot-password?email={quote(email)}"

    safe_name = escape(display_name)
    safe_subject = escape(subject)
    safe_code = escape(code)
    html_body = f"""\
<!doctype html>
<html lang="zh-CN">
  <body style="margin:0;padding:0;background:#0b1120;font-family:'Segoe UI',Arial,'PingFang SC','Microsoft YaHei',sans-serif;color:#e5eefc;">
    <div style="margin:0 auto;max-width:640px;padding:32px 16px;">
      <div style="background:linear-gradient(180deg,#121a2d 0%,#0f172a 100%);border:1px solid #22304d;border-radius:24px;overflow:hidden;box-shadow:0 24px 80px rgba(8,15,31,0.45);">
        <div style="padding:28px 32px 12px 32px;border-bottom:1px solid rgba(148,163,184,0.14);">
          <img src="{logo_url}" alt="Storyforge" style="display:block;width:176px;max-width:100%;height:auto;margin:0 auto 18px auto;" />
          <div style="text-align:center;">
            <div style="font-size:14px;letter-spacing:0.14em;text-transform:uppercase;color:#f59e0b;font-weight:700;">Storyforge</div>
            <h1 style="margin:12px 0 8px 0;font-size:28px;line-height:1.2;color:#f8fafc;">{headline}</h1>
            <p style="margin:0;font-size:15px;line-height:1.7;color:#cbd5e1;">{description}</p>
          </div>
        </div>
        <div style="padding:28px 32px 8px 32px;">
          <p style="margin:0 0 18px 0;font-size:15px;line-height:1.8;color:#dbe4f0;">你好 <strong style="color:#ffffff;">{safe_name}</strong>，</p>
          <p style="margin:0 0 18px 0;font-size:15px;line-height:1.8;color:#dbe4f0;">你正在进行 <strong style="color:#ffffff;">{safe_subject}</strong> 操作。为确保账号安全，请在页面中输入下面的验证码：</p>
          <div style="margin:0 0 20px 0;padding:18px 20px;background:linear-gradient(135deg,#1f2a44 0%,#172036 100%);border:1px solid #31415f;border-radius:18px;text-align:center;">
            <div style="font-size:13px;letter-spacing:0.2em;text-transform:uppercase;color:#93c5fd;margin-bottom:10px;">Verification Code</div>
            <div style="font-size:34px;line-height:1;letter-spacing:0.22em;font-weight:800;color:#ffffff;font-variant-numeric:tabular-nums;">{safe_code}</div>
            <div style="margin-top:12px;font-size:13px;color:#94a3b8;">15 分钟内有效，仅可使用一次</div>
          </div>
          <div style="text-align:center;margin:0 0 22px 0;">
            <a href="{action_url}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#0ea5e9;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">{action_label}</a>
          </div>
          <div style="padding:16px 18px;border-radius:16px;background:rgba(148,163,184,0.08);border:1px solid rgba(148,163,184,0.14);">
            <div style="font-size:13px;line-height:1.8;color:#cbd5e1;">如果这不是你本人发起的操作，请忽略此邮件；只要不输入验证码，账号或密码都不会发生变化。</div>
          </div>
        </div>
        <div style="padding:18px 32px 28px 32px;">
          <div style="font-size:12px;line-height:1.8;color:#94a3b8;text-align:center;">
            此邮件由 Storyforge（叙影工场）系统自动发送，请勿直接回复。<br />
            登录工作台：<a href="{base_url}/login" style="color:#7dd3fc;text-decoration:none;">{base_url}/login</a>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>
"""
    return text_body, html_body


def _serialize_user(user: User) -> AuthenticatedUserResponse:
    return AuthenticatedUserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        display_name=user.display_name,
        role=user.role,
        is_active=user.is_active,
        is_email_verified=user.is_email_verified,
    )


def _registration_delivery_message(delivery: EmailDeliveryStatus) -> str:
    return (
        "Verification code sent"
        if delivery in {"sent", "debug_logged"}
        else "Verification email could not be delivered. Check SMTP activation and sender verification."
    )


async def _delete_unverified_conflicts(repo: UserRepository, *, username: str, email: str) -> None:
    conflicts = await repo.list_with_username_or_email(username=username, email=email)
    username_taken = any(user.username == username and user.is_email_verified for user in conflicts)
    email_taken = any(user.email == email and user.is_email_verified for user in conflicts)
    if username_taken:
        raise HTTPException(status_code=409, detail="Username already exists")
    if email_taken:
        raise HTTPException(status_code=409, detail="Email already exists")

    for user in conflicts:
        if not user.is_email_verified:
            await repo.delete(user)


async def _create_verified_user_from_pending(
    *,
    repo: UserRepository,
    pending: PendingRegistration,
) -> User:
    await _delete_unverified_conflicts(repo, username=pending["username"], email=pending["email"])
    user = await repo.create(
        username=pending["username"],
        email=pending["email"],
        display_name=pending["display_name"],
        password_hash=pending["password_hash"],
        role="user",
        is_active=True,
        is_email_verified=True,
    )
    await repo.touch_last_login(user)
    return user


async def _resolve_db_user(session: AsyncSession, current_user_id: str, current_username: str | None) -> User | None:
    repo = UserRepository(session)
    user = await repo.get_by_id(current_user_id)
    if user is not None:
        return user
    if current_user_id == DEFAULT_USER_ID and current_username:
        return await repo.get_by_username(current_username)
    return None


async def _send_code_email(
    *,
    kind: ChallengeKind,
    email: str,
    code: str,
    display_name: str,
    _t: Translator,
    request: Request,
) -> EmailDeliveryStatus:
    try:
        if kind == "verify_email":
            subject = _t("verify_email_subject")
            body = _t("verify_email_body", name=display_name, code=code)
        else:
            subject = _t("reset_password_subject")
            body = _t("reset_password_body", name=display_name, code=code)
        text_body, html_body = _build_auth_email_bodies(
            kind=kind,
            subject=subject,
            text_body=body,
            email=email,
            display_name=display_name,
            code=code,
            request=request,
        )
        await send_email(to_email=email, subject=subject, body=text_body, html_body=html_body)
    except RuntimeError:
        logger.warning("Email delivery not configured for %s", email)
        return "unavailable"
    except Exception:
        logger.exception("Failed to send auth email to %s", email)
        return "failed"

    return "debug_logged" if get_mailer_config().debug_log_only else "sent"


async def _issue_and_send_code(
    *,
    kind: ChallengeKind,
    email: str,
    display_name: str,
    _t: Translator,
    request: Request,
) -> EmailDeliveryStatus:
    store = get_auth_challenge_store()
    try:
        code = await store.issue_code(kind=kind, subject=email)
    except ChallengeRateLimitedError:
        raise HTTPException(status_code=429, detail="verification code requested too frequently") from None
    return await _send_code_email(kind=kind, email=email, code=code, display_name=display_name, _t=_t, request=request)


async def _authenticate_managed_user(
    identifier: str,
    password: str,
    _t: Translator,
    session: AsyncSession,
) -> User:
    repo = UserRepository(session)
    user = await repo.get_by_identifier(identifier)
    if user is None:
        pending = await get_auth_challenge_store().find_pending_registration(identifier)
        if pending is not None:
            raise HTTPException(status_code=403, detail="Please verify your email before logging in")
        raise HTTPException(
            status_code=401,
            detail=_t("unauthorized"),
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.password_hash or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=401,
            detail=_t("unauthorized"),
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")
    if not user.is_email_verified:
        raise HTTPException(status_code=403, detail="Please verify your email before logging in")

    await repo.touch_last_login(user)
    await session.commit()
    return user


@router.post("/auth/token", response_model=TokenResponse)
async def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    _t: Translator,
    session: AsyncSession = Depends(get_async_session),
):
    identifier = form_data.username.strip()
    user = await _authenticate_managed_user(identifier, form_data.password, _t, session)
    token = create_token(
        user.username,
        user_id=user.id,
        role=user.role,
        email=user.email,
        display_name=user.display_name,
        email_verified=user.is_email_verified,
    )
    return TokenResponse(access_token=token, token_type="bearer", user=_serialize_user(user))


@router.get("/auth/verify", response_model=VerifyResponse)
async def verify(current_user: CurrentUser):
    return VerifyResponse(
        valid=True,
        username=current_user.username or current_user.sub,
        email=current_user.email,
        role=current_user.role,
        is_email_verified=current_user.is_email_verified,
    )


@router.get("/auth/me", response_model=AuthenticatedUserResponse)
async def get_me(
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
):
    user = await _resolve_db_user(session, current_user.id, current_user.username or current_user.sub)
    if user is None:
        return AuthenticatedUserResponse(
            id=current_user.id,
            username=current_user.username or current_user.sub,
            email=current_user.email,
            display_name=current_user.display_name or current_user.username or current_user.sub,
            role=current_user.role,
            is_active=True,
            is_email_verified=current_user.is_email_verified,
        )
    return _serialize_user(user)


@router.patch("/auth/me", response_model=AuthenticatedUserResponse)
async def update_me(
    req: UpdateProfileRequest,
    current_user: CurrentUser,
    _t: Translator,
    session: AsyncSession = Depends(get_async_session),
):
    user = await _resolve_db_user(session, current_user.id, current_user.username or current_user.sub)
    if user is None:
        raise HTTPException(status_code=404, detail="Account not found")

    repo = UserRepository(session)
    await repo.update_profile(user, display_name=req.display_name)
    await session.commit()
    return _serialize_user(user)


@router.post("/auth/register", response_model=RegisterResponse)
async def register(
    req: RegisterRequest,
    request: Request,
    _t: Translator,
    session: AsyncSession = Depends(get_async_session),
):
    username = _normalize_username(req.username)
    email = _normalize_email(req.email)
    display_name = (req.display_name or username).strip()

    repo = UserRepository(session)
    await _delete_unverified_conflicts(repo, username=username, email=email)
    await session.commit()

    store = get_auth_challenge_store()
    pending = await store.save_pending_registration(
        email=email,
        username=username,
        display_name=display_name,
        password_hash=hash_password(req.password),
    )

    delivery = await _issue_and_send_code(
        kind="verify_email",
        email=pending["email"],
        display_name=pending["display_name"],
        _t=_t,
        request=request,
    )
    return RegisterResponse(
        success=True,
        email=pending["email"],
        verification_required=True,
        email_delivery=delivery,
    )


@router.post("/auth/verify-email/request", response_model=GenericSuccessResponse)
async def request_email_verification(
    req: EmailRequest,
    request: Request,
    _t: Translator,
    session: AsyncSession = Depends(get_async_session),
):
    email = _normalize_email(req.email)
    repo = UserRepository(session)
    user = await repo.get_by_email(email)
    if user is not None and user.is_email_verified is True:
        return GenericSuccessResponse(success=True, message="Verification code sent")

    if user is not None:
        delivery = await _issue_and_send_code(
            kind="verify_email", email=user.email, display_name=user.display_name, _t=_t, request=request
        )
    else:
        pending = await get_auth_challenge_store().get_pending_registration(email=email)
        if pending is None:
            return GenericSuccessResponse(success=True, message="Verification code sent")
        delivery = await _issue_and_send_code(
            kind="verify_email",
            email=pending["email"],
            display_name=pending["display_name"],
            _t=_t,
            request=request,
        )
    message = _registration_delivery_message(delivery)
    return GenericSuccessResponse(success=True, message=message, email_delivery=delivery)


@router.post("/auth/verify-email/confirm", response_model=TokenResponse)
async def confirm_email_verification(
    req: VerifyEmailConfirmRequest,
    _t: Translator,
    session: AsyncSession = Depends(get_async_session),
):
    email = _normalize_email(req.email)
    repo = UserRepository(session)
    ok = await get_auth_challenge_store().verify_code(kind="verify_email", subject=email, code=req.code)
    if not ok:
        raise HTTPException(status_code=400, detail="Verification code is invalid or expired")

    pending_consumed = False
    user = await repo.get_by_email(email)
    if user is None:
        pending = await get_auth_challenge_store().get_pending_registration(email=email)
        if pending is None:
            raise HTTPException(status_code=404, detail="Account not found")
        user = await _create_verified_user_from_pending(repo=repo, pending=pending)
        pending_consumed = True
    else:
        await repo.mark_email_verified(user)
        await repo.touch_last_login(user)
    await session.commit()
    if pending_consumed:
        await get_auth_challenge_store().consume_pending_registration(email=email)

    token = create_token(
        user.username,
        user_id=user.id,
        role=user.role,
        email=user.email,
        display_name=user.display_name,
        email_verified=True,
    )
    return TokenResponse(access_token=token, token_type="bearer", user=_serialize_user(user))


@router.post("/auth/password/forgot", response_model=GenericSuccessResponse)
async def forgot_password(
    req: EmailRequest,
    request: Request,
    _t: Translator,
    session: AsyncSession = Depends(get_async_session),
):
    email = _normalize_email(req.email)
    repo = UserRepository(session)
    user = await repo.get_by_email(email)
    if user is not None:
        try:
            await _issue_and_send_code(
                kind="password_reset",
                email=user.email,
                display_name=user.display_name,
                _t=_t,
                request=request,
            )
        except HTTPException:
            raise
        except Exception:
            logger.exception("Failed to issue password reset code for %s", user.email)
    return GenericSuccessResponse(success=True, message="If the account exists, a password reset code has been sent")


@router.post("/auth/password/reset", response_model=GenericSuccessResponse)
async def reset_password(
    req: PasswordResetRequest,
    _t: Translator,
    session: AsyncSession = Depends(get_async_session),
):
    email = _normalize_email(req.email)
    repo = UserRepository(session)
    user = await repo.get_by_email(email)
    if user is None:
        raise HTTPException(status_code=404, detail="Account not found")

    ok = await get_auth_challenge_store().verify_code(kind="password_reset", subject=email, code=req.code)
    if not ok:
        raise HTTPException(status_code=400, detail="Verification code is invalid or expired")

    await repo.update_password(user, password_hash=hash_password(req.new_password))
    await session.commit()
    return GenericSuccessResponse(success=True, message="Password reset successfully")


@router.post("/auth/password/change", response_model=GenericSuccessResponse)
async def change_password(
    req: PasswordChangeRequest,
    current_user: CurrentUser,
    _t: Translator,
    session: AsyncSession = Depends(get_async_session),
):
    user = await _resolve_db_user(session, current_user.id, current_user.username or current_user.sub)
    if user is None:
        raise HTTPException(status_code=404, detail="Account not found")

    if not user.password_hash or not verify_password(req.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    await repo_update_password(session, user, req.new_password)
    return GenericSuccessResponse(success=True, message="Password changed successfully")


async def repo_update_password(session: AsyncSession, user: User, password: str) -> None:
    repo = UserRepository(session)
    await repo.update_password(user, password_hash=hash_password(password))
    await session.commit()
