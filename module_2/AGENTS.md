# AGENTS.md - Mini Kanban (module_2)

Instructions for coding agents working in this project.

## Layout

```
/backend      # FastAPI app + tests (Python, uv)
/docs         # Supporting documentation (plan, process, etc.)
/frontend     # React app (Node.js)
AGENTS.md     # This file
openapi.yaml  # API agreement (source of truth for HTTP contracts)
```

## Product scope

Read `docs/plan.md` before changing behavior. v1 is a personal planner:

- **Left:** timetable grid (Mon-Sun, hours 06:00-23:00)
- **Right:** task grid (cards from all projects)
- Map cards onto timetable cells via drag and drop

Do not add out-of-scope features (multi-user sharing, multi-hour slots, week navigation, etc.) unless the plan is updated first.

## Stack rules

- **Backend:** Python + FastAPI, managed with **uv**. Prefer `uv add` / `uv run` over pip/venv ad-hoc setups.
- **Frontend:** Node.js + React.
- **Database:** In-memory store for now (SQLite later if needed).
- **API:** Implement and keep the backend aligned with `openapi.yaml`. Update the OpenAPI file when changing endpoints or schemas.

## Working agreements

1. Prefer the simplest option that matches `docs/plan.md`.
2. Keep frontend and backend contracts in sync via `openapi.yaml`.
3. Put backend tests under `backend/` (alongside or in a dedicated tests package).
4. Put lasting product/process notes under `docs/`, not in chat-only artifacts.
5. Do not commit secrets or local SQLite data that should stay private.

## Commands

- Backend: `uv sync` then `uv run uvicorn app.main:app --reload --port 8000`
- Frontend: `npm ...` (TBD after scaffold)
- Tests: `cd backend && uv run pytest`

Useful backend commands:

```
uv sync
uv add <PACKAGE-NAME>
uv run uvicorn app.main:app --reload --port 8000
uv run pytest
```

Seed login: username `demo`, password `demo123`.

Regularly commit code to git.
