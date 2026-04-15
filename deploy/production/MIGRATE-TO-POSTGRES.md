# Migrate from SQLite to PostgreSQL

Use this when upgrading an existing Storyforge deployment that still stores relational data in `projects/.arcreel.db`.

## Prerequisites

- PostgreSQL is already running and reachable from the backend container.
- The target database schema has been upgraded with Alembic.
- You still have access to the old SQLite file.

## 1. Stop writes

Stop the old app or scale the old backend to `0` before copying data.

## 2. Back up the SQLite file

```bash
cp projects/.arcreel.db projects/.arcreel.db.bak
```

## 3. Run the migration script

```bash
python scripts/migrate_sqlite_to_postgres.py \
  --source-sqlite projects/.arcreel.db \
  --target-database-url "postgresql+asyncpg://storyforge:<postgres-password>@postgres:5432/storyforge"
```

The script reflects both databases, truncates target application tables, then copies rows in dependency order.

## 4. Verify

Check a few core tables on both sides:

```bash
sqlite3 projects/.arcreel.db "SELECT 'users', COUNT(*) FROM users UNION ALL SELECT 'tasks', COUNT(*) FROM tasks;"
```

```bash
psql "postgresql://storyforge:<postgres-password>@postgres:5432/storyforge" \
  -c "SELECT 'users', COUNT(*) FROM users UNION ALL SELECT 'tasks', COUNT(*) FROM tasks;"
```

## 5. Start the PostgreSQL-backed stack

Make sure `DATABASE_URL` points at PostgreSQL and then start the split deployment.
