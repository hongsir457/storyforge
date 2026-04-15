"""Copy Storyforge relational data from SQLite to PostgreSQL."""

from __future__ import annotations

import argparse
import asyncio
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import sqlalchemy as sa
from sqlalchemy import MetaData, insert, select
from sqlalchemy.ext.asyncio import create_async_engine


def build_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source-sqlite",
        default=str(Path("projects") / ".arcreel.db"),
        help="Path to the source SQLite database file.",
    )
    parser.add_argument(
        "--target-database-url",
        required=True,
        help="Target PostgreSQL DATABASE_URL using the asyncpg driver.",
    )
    return parser.parse_args()


async def reflect_metadata(database_url: str) -> MetaData:
    engine = create_async_engine(database_url)
    metadata = MetaData()
    try:
        async with engine.begin() as conn:
            await conn.run_sync(metadata.reflect)
    finally:
        await engine.dispose()
    return metadata


def _coerce_value(column: sa.Column[Any], value: Any) -> Any:
    if value is None:
        return None

    if isinstance(column.type, sa.Boolean):
        if isinstance(value, bool):
            return value
        if isinstance(value, (int, float)):
            return bool(value)
        if isinstance(value, str):
            return value.strip().lower() in {"1", "true", "t", "yes", "y"}

    if isinstance(column.type, sa.DateTime):
        if isinstance(value, datetime):
            if column.type.timezone and value.tzinfo is None:
                return value.replace(tzinfo=UTC)
            return value
        if isinstance(value, str):
            candidate = value.strip()
            if not candidate:
                return None
            try:
                parsed = datetime.fromisoformat(candidate.replace("Z", "+00:00"))
            except ValueError:
                return value
            if column.type.timezone and parsed.tzinfo is None:
                return parsed.replace(tzinfo=UTC)
            return parsed

    return value


def _legacy_user_fallbacks(row: dict[str, Any]) -> dict[str, Any]:
    username = str(row.get("username") or row.get("id") or "user").strip() or "user"
    email = str(row.get("email") or f"{username.lower()}@storyforge.local").strip().lower()
    display_name = str(row.get("display_name") or username).strip() or username
    password_hash = str(row.get("password_hash") or "").strip()
    last_login_at = row.get("last_login_at") or row.get("updated_at") or row.get("created_at")
    is_email_verified = row.get("is_email_verified") if row.get("is_email_verified") is not None else True
    return {
        "email": email,
        "display_name": display_name,
        "password_hash": password_hash,
        "is_email_verified": is_email_verified,
        "last_login_at": last_login_at,
    }


def _normalize_row(
    table_name: str,
    row: dict[str, Any],
    target_table: sa.Table,
) -> dict[str, Any]:
    payload: dict[str, Any] = {}
    legacy_fallbacks = _legacy_user_fallbacks(row) if table_name == "users" else {}

    for column in target_table.columns:
        if column.name in row:
            value = _coerce_value(column, row[column.name])
        elif column.name in legacy_fallbacks:
            value = _coerce_value(column, legacy_fallbacks[column.name])
        else:
            value = None

        if value is None:
            if column.nullable:
                continue
            if column.server_default is not None or column.default is not None:
                continue
            raise ValueError(
                f"Cannot populate required column '{table_name}.{column.name}' from source row: {row!r}",
            )

        payload[column.name] = value

    return payload


async def main() -> None:
    args = build_args()
    sqlite_path = Path(args.source_sqlite)
    if not sqlite_path.exists():
        raise FileNotFoundError(f"SQLite database not found: {sqlite_path}")

    source_url = f"sqlite+aiosqlite:///{sqlite_path.resolve()}"
    target_url = args.target_database_url

    source_engine = create_async_engine(source_url)
    target_engine = create_async_engine(target_url)

    try:
        source_meta = MetaData()
        target_meta = MetaData()

        async with source_engine.begin() as conn:
          await conn.run_sync(source_meta.reflect)

        async with target_engine.begin() as conn:
          await conn.run_sync(target_meta.reflect)

        table_names = [
            table.name
            for table in source_meta.sorted_tables
            if table.name in target_meta.tables and table.name != "alembic_version"
        ]

        async with source_engine.connect() as source_conn, target_engine.begin() as target_conn:
            for table_name in reversed(table_names):
                await target_conn.execute(target_meta.tables[table_name].delete())

            for table_name in table_names:
                source_table = source_meta.tables[table_name]
                target_table = target_meta.tables[table_name]
                rows = (await source_conn.execute(select(source_table))).mappings().all()
                if not rows:
                    print(f"{table_name}: 0 rows")
                    continue

                payload = [_normalize_row(table_name, dict(row), target_table) for row in rows]
                await target_conn.execute(insert(target_table), payload)
                print(f"{table_name}: {len(payload)} rows")
    finally:
        await source_engine.dispose()
        await target_engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
