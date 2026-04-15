"""Copy Storyforge relational data from SQLite to PostgreSQL."""

from __future__ import annotations

import argparse
import asyncio
from pathlib import Path

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

                target_columns = set(target_table.c.keys())
                payload = [{key: value for key, value in row.items() if key in target_columns} for row in rows]
                await target_conn.execute(insert(target_table), payload)
                print(f"{table_name}: {len(payload)} rows")
    finally:
        await source_engine.dispose()
        await target_engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
