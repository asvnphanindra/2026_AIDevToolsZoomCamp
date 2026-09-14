"""Quick DB smoke check for Weekslot.

Uses the same DATABASE_URL as the API (default: sqlite:///./weekslot.db).

Usage (from backend/):
    uv run python check_db.py
"""

from __future__ import annotations

import sys

from sqlalchemy import create_engine, inspect, text

from app.config import get_database_url


def main() -> int:
    url = get_database_url()
    print(f"DATABASE_URL = {url}")
    print()

    connect_args = {"check_same_thread": False} if url.startswith("sqlite:") else {}
    engine = create_engine(url, connect_args=connect_args)

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:  # noqa: BLE001 - script should print any connect failure
        print(f"FAILED to connect: {exc}", file=sys.stderr)
        return 1

    inspector = inspect(engine)
    tables = sorted(inspector.get_table_names())
    if not tables:
        print("Connected, but no tables found.")
        print("Start the API once so it can create + seed the schema:")
        print("  uv run uvicorn app.main:app --reload --port 8000")
        return 1

    print(f"Tables ({len(tables)}): {', '.join(tables)}")
    print()

    expected = {"users", "tokens", "projects", "cards", "settings"}
    missing = sorted(expected - set(tables))
    if missing:
        print(f"WARNING: missing expected tables: {', '.join(missing)}")
        print()

    queries = [
        ("users", "SELECT username FROM users ORDER BY username"),
        ("projects", "SELECT id, name, color_index FROM projects ORDER BY id"),
        (
            "cards",
            "SELECT id, project_id, title, status, slot_day, slot_hour "
            "FROM cards ORDER BY id",
        ),
        ("settings", "SELECT id, monday_date FROM settings ORDER BY id"),
        ("tokens", "SELECT COUNT(*) AS token_count FROM tokens"),
    ]

    with engine.connect() as conn:
        for label, sql in queries:
            if label not in tables:
                continue
            print(f"== {label} ==")
            rows = conn.execute(text(sql)).mappings().all()
            if not rows:
                print("(empty)")
            else:
                for row in rows:
                    print(dict(row))
            print()

    print("OK - database is reachable and readable.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
