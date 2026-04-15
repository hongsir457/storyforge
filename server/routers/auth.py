"""Authentication APIs for login, registration, verification, and profile management."""

from __future__ import annotations

import logging
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from lib.db import async_session_factory, get_async_session
from lib.db.base import DEFAULT_USER_ID
from lib.db.models.user import User
from lib.db.repositories.user_repository import UserRepository
from lib.i18n import Translator
from server.auth import (
    CurrentUser,
    check_credentials,
    create_token,
    hash_password,
    verify_password,
)
from server.services.auth_challenge_store import (
    ChallengeRateLimitedError,
    ChallengeKind,
    get_auth_challenge_store,
)
from server.services.mailer import get_mailer_config, send_email

logger = logging.getLogger(__name__)

router = APIRouter()


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
    email_delivery: Literal["sent", "debug_logged", "unavailable"]


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
) -> Literal["sent", "debug_logged", "unavailable"]:
    try:
        if kind == "verify_email":
            subject = _t("verify_email_subject")
            body = _t("verify_email_body", name=display_name, code=code)
        else:
            subject = _t("reset_password_subject")
            body = _t("reset_password_body", name=display_name, code=code)
        await send_email(to_email=email, subject=subject, body=body)
    except RuntimeError:
        logger.warning("Email delivery not configured for %s", email)
        return "unavailable"
    except Exception:
        logger.exception("Failed to send auth email to %s", email)
        return "unavailable"

    return "debug_logged" if get_mailer_config().debug_log_only else "sent"


async def _issue_and_send_code(
    *,
    kind: ChallengeKind,
    email: str,
    display_name: str,
    _t: Translator,
) -> Literal["sent", "debug_logged", "unavailable"]:
    store = get_auth_challenge_store()
    try:
        code = await store.issue_code(kind=kind, subject=email)
    except ChallengeRateLimitedError:
        raise HTTPException(status_code=429, detail="verification code requested too frequently") from None
    return await _send_code_email(kind=kind, email=email, code=code, display_name=display_name, _t=_t)


async def _authenticate_managed_user(identifier: str, password: str, _t: Translator) -> User:
    async with async_session_factory() as session:
        repo = UserRepository(session)
        user = await repo.get_by_identifier(identifier)
        if user is None or not user.password_hash or not verify_password(password, user.password_hash):
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
):
    identifier = form_data.username.strip()

    if check_credentials(identifier, form_data.password):
        bootstrap_email = (form_data.username.strip().lower() + "@storyforge.local")
        user = AuthenticatedUserResponse(
            id=DEFAULT_USER_ID,
            username=identifier,
            email=bootstrap_email,
            display_name=identifier,
            role="admin",
            is_active=True,
            is_email_verified=True,
        )
        token = create_token(
            identifier,
            user_id=user.id,
            role=user.role,
            email=user.email,
            display_name=user.display_name,
            email_verified=user.is_email_verified,
        )
        return TokenResponse(access_token=token, token_type="bearer", user=user)

    user = await _authenticate_managed_user(identifier, form_data.password, _t)
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
    _t: Translator,
    session: AsyncSession = Depends(get_async_session),
):
    username = _normalize_username(req.username)
    email = _normalize_email(req.email)
    display_name = (req.display_name or username).strip()

    repo = UserRepository(session)
    username_exists, email_exists = await repo.exists_with_username_or_email(username=username, email=email)
    if username_exists:
        raise HTTPException(status_code=409, detail="Username already exists")
    if email_exists:
        raise HTTPException(status_code=409, detail="Email already exists")

    user = await repo.create(
        username=username,
        email=email,
        display_name=display_name,
        password_hash=hash_password(req.password),
        role="user",
        is_active=True,
        is_email_verified=False,
    )
    await session.commit()

    delivery = await _issue_and_send_code(
        kind="verify_email",
        email=user.email,
        display_name=user.display_name,
        _t=_t,
    )
    return RegisterResponse(
        success=True,
        email=user.email,
        verification_required=True,
        email_delivery=delivery,
    )


@router.post("/auth/verify-email/request", response_model=GenericSuccessResponse)
async def request_email_verification(
    req: EmailRequest,
    _t: Translator,
    session: AsyncSession = Depends(get_async_session),
):
    email = _normalize_email(req.email)
    repo = UserRepository(session)
    user = await repo.get_by_email(email)
    if user is None or user.is_email_verified is True:
        return GenericSuccessResponse(success=True, message="Verification code sent")

    await _issue_and_send_code(kind="verify_email", email=user.email, display_name=user.display_name, _t=_t)
    return GenericSuccessResponse(success=True, message="Verification code sent")


@router.post("/auth/verify-email/confirm", response_model=TokenResponse)
async def confirm_email_verification(
    req: VerifyEmailConfirmRequest,
    _t: Translator,
    session: AsyncSession = Depends(get_async_session),
):
    email = _normalize_email(req.email)
    repo = UserRepository(session)
    user = await repo.get_by_email(email)
    if user is None:
        raise HTTPException(status_code=404, detail="Account not found")

    ok = await get_auth_challenge_store().verify_code(kind="verify_email", subject=email, code=req.code)
    if not ok:
        raise HTTPException(status_code=400, detail="Verification code is invalid or expired")

    await repo.mark_email_verified(user)
    await repo.touch_last_login(user)
    await session.commit()

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
    _t: Translator,
    session: AsyncSession = Depends(get_async_session),
):
    email = _normalize_email(req.email)
    repo = UserRepository(session)
    user = await repo.get_by_email(email)
    if user is not None:
        try:
            await _issue_and_send_code(kind="password_reset", email=user.email, display_name=user.display_name, _t=_t)
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
