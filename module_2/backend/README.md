# Backend

FastAPI API for Mini Kanban (`module_2`). Implements `../openapi.yaml`.

## Setup

```bash
uv sync
```

## Database

Connection is configured with the `DATABASE_URL` environment variable
(SQLAlchemy URL). Default is a local SQLite file:

```bash
# default (if unset)
sqlite:///./kanban.db

# examples
set DATABASE_URL=sqlite:///./kanban.db
set DATABASE_URL=postgresql+psycopg://user:pass@localhost:5432/kanban
```

The app uses SQLAlchemy and stays database-agnostic: switching engines is a
URL (+ driver package) change, not an application rewrite.

On startup the server creates tables and seeds demo data when the DB is empty.

## Run

```bash
uv run uvicorn app.main:app --reload --port 8000
```

## Tests

```bash
uv run pytest
```

## Check the database

```bash
uv run python check_db.py
```

Uses `DATABASE_URL` (same as the server). Prints tables and sample rows.

## Seed credentials

| Username | Password |
|----------|----------|
| `demo`   | `demo123` |
