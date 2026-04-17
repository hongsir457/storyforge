from __future__ import annotations

import os
from dataclasses import asdict, dataclass
from typing import Literal

from sqlalchemy.ext.asyncio import AsyncSession

from lib.config.registry import PROVIDER_REGISTRY
from lib.config.repository import ProviderConfigRepository, SystemSettingRepository
from lib.db.repositories.credential_repository import CredentialRepository

_DEFAULT_VIDEO_BACKEND = "gemini-aistudio/veo-3.1-lite-generate-preview"
_DEFAULT_IMAGE_BACKEND = "gemini-aistudio/gemini-3.1-flash-image-preview"
_DEFAULT_TEXT_BACKEND = "gemini-aistudio/gemini-3-flash-preview"
_NOVEL_WORKBENCH_DEFAULTS: dict[str, str] = {
    "AUTONOVEL_WRITER_MODEL": "gemini-3.1-pro-preview",
    "AUTONOVEL_JUDGE_MODEL": "gemini-3-flash-preview",
    "AUTONOVEL_REVIEW_MODEL": "gemini-3.1-pro-preview",
    "AUTONOVEL_API_BASE_URL": "https://generativelanguage.googleapis.com",
}

# DB setting key → environment variable name
_ANTHROPIC_ENV_MAP: dict[str, str] = {
    "anthropic_api_key": "ANTHROPIC_API_KEY",
    "anthropic_auth_token": "ANTHROPIC_AUTH_TOKEN",
    "anthropic_base_url": "ANTHROPIC_BASE_URL",
    "anthropic_model": "ANTHROPIC_MODEL",
    "anthropic_default_haiku_model": "ANTHROPIC_DEFAULT_HAIKU_MODEL",
    "anthropic_default_opus_model": "ANTHROPIC_DEFAULT_OPUS_MODEL",
    "anthropic_default_sonnet_model": "ANTHROPIC_DEFAULT_SONNET_MODEL",
    "claude_code_subagent_model": "CLAUDE_CODE_SUBAGENT_MODEL",
}


def sync_anthropic_env(all_settings: dict[str, str]) -> None:
    """Sync Anthropic-related DB settings to environment variables.

    The Claude Agent SDK reads config from os.environ, so DB values
    must be mirrored to env vars for the SDK to pick them up.
    """
    for db_key, env_key in _ANTHROPIC_ENV_MAP.items():
        value = all_settings.get(db_key, "").strip()
        if value:
            os.environ[env_key] = value
        else:
            os.environ.pop(env_key, None)


@dataclass
class ProviderStatus:
    name: str
    display_name: str
    description: str
    status: Literal["ready", "unconfigured", "error"]
    media_types: list[str]
    capabilities: list[str]
    required_keys: list[str]
    configured_keys: list[str]
    missing_keys: list[str]
    models: dict[str, dict] | None = None  # model_id -> ModelInfo dict representation


class ConfigService:
    def __init__(self, session: AsyncSession) -> None:
        self._provider_repo = ProviderConfigRepository(session)
        self._setting_repo = SystemSettingRepository(session)

    async def get_provider_config(self, provider: str) -> dict[str, str]:
        self._validate_provider(provider)
        return await self._provider_repo.get_all(provider)

    async def set_provider_config(
        self,
        provider: str,
        key: str,
        value: str,
        *,
        flush: bool = True,
    ) -> None:
        self._validate_provider(provider)
        meta = PROVIDER_REGISTRY[provider]
        is_secret = key in meta.secret_keys
        await self._provider_repo.set(provider, key, value, is_secret=is_secret, flush=flush)

    async def delete_provider_config(
        self,
        provider: str,
        key: str,
        *,
        flush: bool = True,
    ) -> None:
        self._validate_provider(provider)
        await self._provider_repo.delete(provider, key, flush=flush)

    async def get_all_providers_status(self) -> list[ProviderStatus]:
        all_configured = await self._provider_repo.get_all_configured_keys_bulk()
        cred_repo = CredentialRepository(self._provider_repo.session)
        active_creds = await cred_repo.get_active_credentials_bulk()
        statuses = []
        for name, meta in PROVIDER_REGISTRY.items():
            has_active = name in active_creds
            configured = all_configured.get(name, [])
            if has_active:
                status: Literal["ready", "unconfigured", "error"] = "ready"
                missing: list[str] = []
            else:
                status = "unconfigured"
                missing = list(meta.required_keys)
            models_dict = {mid: asdict(mi) for mid, mi in meta.models.items()}
            statuses.append(
                ProviderStatus(
                    name=name,
                    display_name=meta.display_name,
                    description=meta.description,
                    status=status,
                    media_types=list(meta.media_types),
                    capabilities=list(meta.capabilities),
                    required_keys=list(meta.required_keys),
                    configured_keys=configured,
                    missing_keys=missing,
                    models=models_dict,
                )
            )
        return statuses

    async def get_all_provider_configs(self) -> dict[str, dict[str, str]]:
        """Get raw config for ALL providers in a single query."""
        return await self._provider_repo.get_all_configs_bulk()

    async def get_provider_config_masked(self, provider: str) -> dict[str, dict]:
        self._validate_provider(provider)
        return await self._provider_repo.get_all_masked(provider)

    async def get_setting(self, key: str, default: str = "") -> str:
        return await self._setting_repo.get(key, default)

    async def get_all_settings(self) -> dict[str, str]:
        """Get all system settings in a single query."""
        return await self._setting_repo.get_all()

    async def set_setting(self, key: str, value: str) -> None:
        await self._setting_repo.set(key, value)

    async def build_novel_workbench_runtime_env(self) -> dict[str, str]:
        """Resolve the runtime env snapshot used by Novel Workbench.

        The workbench runs autonovel in an isolated workspace. It should read
        the active Gemini provider credential from the DB directly instead of
        relying on uvicorn process env having been pre-synced.
        """

        all_settings = await self.get_all_settings()
        gemini_cfg = await self.get_provider_config("gemini-aistudio")
        cred_repo = CredentialRepository(self._provider_repo.session)
        active_credential = await cred_repo.get_active("gemini-aistudio")
        if active_credential:
            active_credential.overlay_config(gemini_cfg)

        script_backend = all_settings.get("text_backend_script", "").strip()
        writer_model_from_backend = ""
        if "/" in script_backend:
            provider_id, model_id = script_backend.split("/", 1)
            if provider_id in {"gemini-aistudio", "gemini-vertex"}:
                writer_model_from_backend = model_id.strip()

        api_key = (
            all_settings.get("gemini_api_key", "").strip()
            or gemini_cfg.get("api_key", "").strip()
            or os.environ.get("GEMINI_API_KEY", "").strip()
            or os.environ.get("GOOGLE_API_KEY", "").strip()
        )
        api_base_url = (
            all_settings.get("gemini_base_url", "").strip()
            or gemini_cfg.get("base_url", "").strip()
            or os.environ.get("AUTONOVEL_API_BASE_URL", "").strip()
            or os.environ.get("GEMINI_BASE_URL", "").strip()
            or _NOVEL_WORKBENCH_DEFAULTS["AUTONOVEL_API_BASE_URL"]
        )

        writer_model = (
            all_settings.get("autonovel_writer_model", "").strip()
            or writer_model_from_backend
            or _NOVEL_WORKBENCH_DEFAULTS["AUTONOVEL_WRITER_MODEL"]
        )
        review_model = (
            all_settings.get("autonovel_review_model", "").strip()
            or writer_model_from_backend
            or _NOVEL_WORKBENCH_DEFAULTS["AUTONOVEL_REVIEW_MODEL"]
        )
        judge_model = (
            all_settings.get("autonovel_judge_model", "").strip() or _NOVEL_WORKBENCH_DEFAULTS["AUTONOVEL_JUDGE_MODEL"]
        )

        return {
            "GEMINI_API_KEY": api_key,
            "AUTONOVEL_WRITER_MODEL": writer_model,
            "AUTONOVEL_JUDGE_MODEL": judge_model,
            "AUTONOVEL_REVIEW_MODEL": review_model,
            "AUTONOVEL_API_BASE_URL": api_base_url,
            "FAL_KEY": os.environ.get("FAL_KEY", "").strip(),
            "ELEVENLABS_API_KEY": os.environ.get("ELEVENLABS_API_KEY", "").strip(),
        }

    async def get_default_video_backend(self) -> tuple[str, str]:
        raw = await self._setting_repo.get("default_video_backend", _DEFAULT_VIDEO_BACKEND)
        return self._parse_backend(raw, _DEFAULT_VIDEO_BACKEND)

    async def get_default_image_backend(self) -> tuple[str, str]:
        raw = await self._setting_repo.get("default_image_backend", _DEFAULT_IMAGE_BACKEND)
        return self._parse_backend(raw, _DEFAULT_IMAGE_BACKEND)

    async def get_default_text_backend(self) -> tuple[str, str]:
        raw = await self._setting_repo.get("default_text_backend", _DEFAULT_TEXT_BACKEND)
        return self._parse_backend(raw, _DEFAULT_TEXT_BACKEND)

    @staticmethod
    def _validate_provider(provider: str) -> None:
        if provider not in PROVIDER_REGISTRY:
            raise ValueError(f"Unknown provider: {provider}")

    @staticmethod
    def _parse_backend(raw: str, fallback: str) -> tuple[str, str]:
        if "/" in raw:
            provider_id, model_id = raw.split("/", 1)
            return provider_id, model_id
        parts = fallback.split("/", 1)
        return parts[0], parts[1]
