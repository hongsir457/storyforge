"""Repository helpers for user accounts."""

from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from lib.db.base import utc_now
from lib.db.models.user import User
from lib.db.repositories.base import BaseRepository


class UserRepository(BaseRepository):
    def __init__(self, session: AsyncSession):
        super().__init__(session)

    async def get_by_id(self, user_id: str) -> User | None:
        stmt = self._scope_query(select(User).where(User.id == user_id), User)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_username(self, username: str) -> User | None:
        stmt = self._scope_query(select(User).where(User.username == username), User)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        stmt = self._scope_query(select(User).where(User.email == email), User)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_identifier(self, identifier: str) -> User | None:
        normalized = identifier.strip().lower()
        stmt = self._scope_query(
            select(User).where(or_(User.username == identifier.strip(), User.email == normalized)),
            User,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(
        self,
        *,
        username: str,
        email: str,
        display_name: str,
        password_hash: str,
        role: str = "user",
        is_active: bool = True,
        is_email_verified: bool = False,
    ) -> User:
        user = User(
            id=uuid4().hex,
            username=username.strip(),
            email=email.strip().lower(),
            display_name=display_name.strip(),
            password_hash=password_hash,
            role=role,
            is_active=is_active,
            is_email_verified=is_email_verified,
        )
        self.session.add(user)
        await self.session.flush()
        await self.session.refresh(user)
        return user

    async def update_profile(self, user: User, *, display_name: str) -> User:
        user.display_name = display_name.strip()
        user.updated_at = utc_now()
        await self.session.flush()
        await self.session.refresh(user)
        return user

    async def update_password(self, user: User, *, password_hash: str) -> User:
        user.password_hash = password_hash
        user.updated_at = utc_now()
        await self.session.flush()
        await self.session.refresh(user)
        return user

    async def mark_email_verified(self, user: User) -> User:
        user.is_email_verified = True
        user.updated_at = utc_now()
        await self.session.flush()
        await self.session.refresh(user)
        return user

    async def touch_last_login(self, user: User) -> User:
        now = utc_now()
        user.last_login_at = now
        user.updated_at = now
        await self.session.flush()
        await self.session.refresh(user)
        return user

    async def list_admins(self) -> list[User]:
        stmt = self._scope_query(select(User).where(User.role == "admin").order_by(User.created_at.asc()), User)
        result = await self.session.execute(stmt)
        return list(result.scalars())

    async def exists_with_username_or_email(self, *, username: str, email: str) -> tuple[bool, bool]:
        stmt = self._scope_query(
            select(User).where(or_(User.username == username.strip(), User.email == email.strip().lower())),
            User,
        )
        result = await self.session.execute(stmt)
        users = list(result.scalars())
        has_username = any(user.username == username.strip() for user in users)
        has_email = any(user.email == email.strip().lower() for user in users)
        return has_username, has_email

    async def set_bootstrap_fields(
        self,
        user: User,
        *,
        email: str,
        display_name: str,
        password_hash: str | None = None,
        last_login_at: datetime | None = None,
    ) -> User:
        user.email = email.strip().lower()
        user.display_name = display_name.strip()
        user.role = "admin"
        user.is_active = True
        user.is_email_verified = True
        if password_hash:
            user.password_hash = password_hash
        if last_login_at is not None:
            user.last_login_at = last_login_at
        user.updated_at = utc_now()
        await self.session.flush()
        await self.session.refresh(user)
        return user
