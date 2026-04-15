"""Tests for authentication helpers in server.auth."""

import os
import time
from unittest.mock import patch

from fastapi import HTTPException

import server.auth as auth_module


class TestGeneratePassword:
    def test_generate_password(self):
        pwd = auth_module.generate_password()
        assert len(pwd) == 16
        assert pwd.isalnum()

    def test_generate_password_custom_length(self):
        pwd = auth_module.generate_password(length=32)
        assert len(pwd) == 32
        assert pwd.isalnum()


class TestTokenSecret:
    def setup_method(self):
        auth_module._cached_token_secret = None

    def test_get_token_secret_from_env(self):
        with patch.dict(os.environ, {"AUTH_TOKEN_SECRET": "my-secret-key"}):
            secret = auth_module.get_token_secret()
            assert secret == "my-secret-key"

    def test_get_token_secret_auto_generate(self):
        env = os.environ.copy()
        env.pop("AUTH_TOKEN_SECRET", None)
        with patch.dict(os.environ, env, clear=True):
            secret1 = auth_module.get_token_secret()
            assert secret1 is not None
            assert len(secret1) > 0

            secret2 = auth_module.get_token_secret()
            assert secret1 == secret2


class TestCreateAndVerifyToken:
    def setup_method(self):
        auth_module._cached_token_secret = None

    def test_create_and_verify_token(self):
        with patch.dict(os.environ, {"AUTH_TOKEN_SECRET": "test-secret-key-that-is-at-least-32-bytes"}):
            token = auth_module.create_token("admin")
            payload = auth_module.verify_token(token)
            assert payload is not None
            assert payload["sub"] == "admin"
            assert "iat" in payload
            assert "exp" in payload

    def test_verify_token_invalid(self):
        with patch.dict(os.environ, {"AUTH_TOKEN_SECRET": "test-secret-key-that-is-at-least-32-bytes"}):
            result = auth_module.verify_token("this-is-not-a-valid-jwt")
            assert result is None

    def test_verify_token_expired(self):
        import jwt

        secret = "test-secret-key-that-is-at-least-32-bytes"
        with patch.dict(os.environ, {"AUTH_TOKEN_SECRET": secret}):
            payload = {
                "sub": "admin",
                "iat": time.time() - 3600,
                "exp": time.time() - 1,
            }
            expired_token = jwt.encode(payload, secret, algorithm="HS256")
            result = auth_module.verify_token(expired_token)
            assert result is None


class TestCheckCredentials:
    def setup_method(self):
        auth_module._cached_password_hash = None

    def test_check_credentials_valid(self):
        with patch.dict(os.environ, {"AUTH_USERNAME": "admin", "AUTH_PASSWORD": "pass123"}):
            assert auth_module.check_credentials("admin", "pass123") is True

    def test_check_credentials_invalid(self):
        with patch.dict(os.environ, {"AUTH_USERNAME": "admin", "AUTH_PASSWORD": "pass123"}):
            assert auth_module.check_credentials("admin", "wrong") is False
            assert auth_module.check_credentials("nobody", "pass123") is False

    def test_check_credentials_default_username(self):
        env = os.environ.copy()
        env.pop("AUTH_USERNAME", None)
        env["AUTH_PASSWORD"] = "secret"
        with patch.dict(os.environ, env, clear=True):
            assert auth_module.check_credentials("admin", "secret") is True


class TestEnsureAuthPassword:
    def setup_method(self):
        auth_module._cached_token_secret = None

    def test_existing_password_returned(self):
        with patch.dict(os.environ, {"AUTH_PASSWORD": "existing-pwd"}):
            result = auth_module.ensure_auth_password()
            assert result == "existing-pwd"

    def test_auto_generate_when_empty(self, tmp_path):
        env = os.environ.copy()
        env.pop("AUTH_PASSWORD", None)
        env_file = tmp_path / ".env"
        env_file.write_text("SOME_VAR=value\n")
        with patch.dict(os.environ, env, clear=True):
            result = auth_module.ensure_auth_password(env_path=str(env_file))
            assert len(result) == 16
            assert result.isalnum()
            assert os.environ["AUTH_PASSWORD"] == result

    def test_writeback_replace_existing_line(self, tmp_path):
        env_file = tmp_path / ".env"
        env_file.write_text("SOME_VAR=hello\nAUTH_PASSWORD=\nOTHER=world\n")
        env = os.environ.copy()
        env.pop("AUTH_PASSWORD", None)
        with patch.dict(os.environ, env, clear=True):
            password = auth_module.ensure_auth_password(env_path=str(env_file))
            content = env_file.read_text()
            assert f"AUTH_PASSWORD={password}" in content
            assert "SOME_VAR=hello" in content
            assert "OTHER=world" in content

    def test_writeback_append_when_no_line(self, tmp_path):
        env_file = tmp_path / ".env"
        env_file.write_text("SOME_VAR=hello\n")
        env = os.environ.copy()
        env.pop("AUTH_PASSWORD", None)
        with patch.dict(os.environ, env, clear=True):
            password = auth_module.ensure_auth_password(env_path=str(env_file))
            content = env_file.read_text()
            assert f"AUTH_PASSWORD={password}" in content
            assert "SOME_VAR=hello" in content

    def test_env_file_not_exist_no_error(self, tmp_path):
        env_file = tmp_path / "nonexistent" / ".env"
        env = os.environ.copy()
        env.pop("AUTH_PASSWORD", None)
        with patch.dict(os.environ, env, clear=True):
            password = auth_module.ensure_auth_password(env_path=str(env_file))
            assert len(password) == 16
            assert password.isalnum()


class TestDownloadToken:
    def setup_method(self):
        auth_module._cached_token_secret = None

    def test_create_and_verify_download_token(self):
        with patch.dict(os.environ, {"AUTH_TOKEN_SECRET": "test-secret-key-that-is-at-least-32-bytes"}):
            token = auth_module.create_download_token("admin", "my-project")
            payload = auth_module.verify_download_token(token, "my-project")
            assert payload["sub"] == "admin"
            assert payload["project"] == "my-project"
            assert payload["purpose"] == "download"

    def test_verify_download_token_wrong_project(self):
        with patch.dict(os.environ, {"AUTH_TOKEN_SECRET": "test-secret-key-that-is-at-least-32-bytes"}):
            token = auth_module.create_download_token("admin", "project-a")
            import pytest

            with pytest.raises(ValueError, match="token project mismatch"):
                auth_module.verify_download_token(token, "project-b")

    def test_verify_download_token_expired(self):
        import jwt
        import pytest

        secret = "test-secret-key-that-is-at-least-32-bytes"
        with patch.dict(os.environ, {"AUTH_TOKEN_SECRET": secret}):
            payload = {
                "sub": "admin",
                "project": "demo",
                "purpose": "download",
                "iat": time.time() - 600,
                "exp": time.time() - 1,
            }
            expired_token = jwt.encode(payload, secret, algorithm="HS256")
            with pytest.raises(jwt.ExpiredSignatureError):
                auth_module.verify_download_token(expired_token, "demo")

    def test_verify_download_token_wrong_purpose(self):
        import jwt
        import pytest

        secret = "test-secret-key-that-is-at-least-32-bytes"
        with patch.dict(os.environ, {"AUTH_TOKEN_SECRET": secret}):
            payload = {
                "sub": "admin",
                "project": "demo",
                "purpose": "other",
                "iat": time.time(),
                "exp": time.time() + 300,
            }
            token = jwt.encode(payload, secret, algorithm="HS256")
            with pytest.raises(ValueError, match="token purpose mismatch"):
                auth_module.verify_download_token(token, "demo")


class TestPasswordHash:
    def setup_method(self):
        auth_module._cached_password_hash = None

    def test_check_credentials_with_hash(self):
        with patch.dict(os.environ, {"AUTH_USERNAME": "admin", "AUTH_PASSWORD": "pass123"}):
            assert auth_module.check_credentials("admin", "pass123") is True

    def test_check_credentials_wrong_password_with_hash(self):
        with patch.dict(os.environ, {"AUTH_USERNAME": "admin", "AUTH_PASSWORD": "pass123"}):
            assert auth_module.check_credentials("admin", "wrong") is False

    def test_check_credentials_wrong_username_timing_safe(self):
        with patch.dict(os.environ, {"AUTH_USERNAME": "admin", "AUTH_PASSWORD": "pass123"}):
            assert auth_module.check_credentials("nobody", "pass123") is False

    def test_password_hash_cached(self):
        with patch.dict(os.environ, {"AUTH_USERNAME": "admin", "AUTH_PASSWORD": "pass123"}):
            auth_module.check_credentials("admin", "pass123")
            first_hash = auth_module._cached_password_hash
            auth_module.check_credentials("admin", "pass123")
            assert auth_module._cached_password_hash is first_hash


class TestGetCurrentUser:
    def setup_method(self):
        auth_module._cached_token_secret = None

    async def test_get_current_user_valid_token(self):
        with patch.dict(os.environ, {"AUTH_TOKEN_SECRET": "test-secret-key-that-is-at-least-32-bytes"}):
            token = auth_module.create_token("admin")
            result = await auth_module.get_current_user(token)
            assert isinstance(result, auth_module.CurrentUserInfo)
            assert result.sub == "admin"
            assert result.id == "default"
            assert result.role == "admin"

    async def test_get_current_user_invalid_token(self):
        import pytest

        with patch.dict(os.environ, {"AUTH_TOKEN_SECRET": "test-secret-key-that-is-at-least-32-bytes"}):
            with pytest.raises(HTTPException) as exc_info:
                await auth_module.get_current_user("invalid-token")
            assert exc_info.value.status_code == 401

    async def test_get_current_user_flexible_header(self):
        with patch.dict(os.environ, {"AUTH_TOKEN_SECRET": "test-secret-key-that-is-at-least-32-bytes"}):
            token = auth_module.create_token("admin")
            result = await auth_module.get_current_user_flexible(token, None)
            assert isinstance(result, auth_module.CurrentUserInfo)
            assert result.sub == "admin"

    async def test_get_current_user_flexible_query(self):
        with patch.dict(os.environ, {"AUTH_TOKEN_SECRET": "test-secret-key-that-is-at-least-32-bytes"}):
            token = auth_module.create_token("admin")
            result = await auth_module.get_current_user_flexible(None, token)
            assert isinstance(result, auth_module.CurrentUserInfo)
            assert result.sub == "admin"

    async def test_get_current_user_flexible_no_token(self):
        import pytest

        with pytest.raises(HTTPException) as exc_info:
            await auth_module.get_current_user_flexible(None, None)
        assert exc_info.value.status_code == 401
