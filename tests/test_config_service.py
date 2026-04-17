import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from lib.config.service import ConfigService
from lib.db.base import Base
from lib.db.repositories.credential_repository import CredentialRepository


@pytest.fixture
async def session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    sm = async_sessionmaker(engine, expire_on_commit=False)
    async with sm() as s:
        yield s
    await engine.dispose()


@pytest.fixture
def config_service(session: AsyncSession) -> ConfigService:
    return ConfigService(session)


async def test_get_all_providers_status_empty(config_service: ConfigService):
    statuses = await config_service.get_all_providers_status()
    assert len(statuses) == 5
    for s in statuses:
        assert s.status == "unconfigured"


async def test_provider_becomes_ready(config_service: ConfigService, session: AsyncSession):
    # 新逻辑：status 由凭证表中的活跃凭证决定，而不是 ProviderConfig 表
    cred_repo = CredentialRepository(session)
    await cred_repo.create("gemini-aistudio", "default", api_key="AIza-test")
    await session.flush()
    statuses = await config_service.get_all_providers_status()
    aistudio = next(s for s in statuses if s.name == "gemini-aistudio")
    assert aistudio.status == "ready"
    assert aistudio.missing_keys == []


async def test_get_provider_config(config_service: ConfigService):
    await config_service.set_provider_config("grok", "api_key", "xai-test")
    config = await config_service.get_provider_config("grok")
    assert config == {"api_key": "xai-test"}


async def test_delete_provider_config(config_service: ConfigService):
    await config_service.set_provider_config("grok", "api_key", "xai-test")
    await config_service.delete_provider_config("grok", "api_key")
    config = await config_service.get_provider_config("grok")
    assert config == {}


async def test_system_settings(config_service: ConfigService):
    await config_service.set_setting("default_video_backend", "gemini-vertex/veo-3.1-fast-generate-001")
    val = await config_service.get_setting("default_video_backend")
    assert val == "gemini-vertex/veo-3.1-fast-generate-001"


async def test_get_default_video_backend(config_service: ConfigService):
    await config_service.set_setting("default_video_backend", "ark/doubao-seedance-1-5-pro-251215")
    provider_id, model_id = await config_service.get_default_video_backend()
    assert provider_id == "ark"
    assert model_id == "doubao-seedance-1-5-pro-251215"


async def test_get_default_backend_fallback(config_service: ConfigService):
    provider_id, model_id = await config_service.get_default_video_backend()
    assert provider_id == "gemini-aistudio"


async def test_unknown_provider_raises(config_service: ConfigService):
    with pytest.raises(ValueError, match="Unknown provider"):
        await config_service.set_provider_config("unknown-provider", "key", "val")


async def test_build_novel_workbench_runtime_env_uses_active_gemini_credential(
    config_service: ConfigService,
    session: AsyncSession,
):
    cred_repo = CredentialRepository(session)
    await cred_repo.create(
        "gemini-aistudio",
        "default",
        api_key="AIza-novel-test",
        base_url="https://gemini.test",
    )
    await config_service.set_setting("text_backend_script", "gemini-aistudio/gemini-3-flash-preview")

    runtime_env = await config_service.build_novel_workbench_runtime_env()

    assert runtime_env["GEMINI_API_KEY"] == "AIza-novel-test"
    assert runtime_env["AUTONOVEL_API_BASE_URL"] == "https://gemini.test"
    assert runtime_env["AUTONOVEL_WRITER_MODEL"] == "gemini-3-flash-preview"
    assert runtime_env["AUTONOVEL_REVIEW_MODEL"] == "gemini-3-flash-preview"
    assert runtime_env["AUTONOVEL_JUDGE_MODEL"] == "gemini-3-flash-preview"
