# AI Dev Tools Zoomcamp 2026

Course work for the [AI Dev Tools Zoomcamp](https://github.com/DataTalksClub/ai-dev-tools-zoomcamp) — turning vague product ideas into specs, backlogs, and agent-built software.

## Modules

| Module | Description |
|--------|-------------|
| [module_1](module_1/) | Household chores app — Django + SQLite, invite-code join, claim/complete workflow |
| [module_2](module_2/) | Full-stack app (OpenAPI, backend, frontend) — Weekslot / Mini Kanban style homework |
| [module_3](module_3/) | Containerize and deploy **Agent Relay** — Docker, Compose + Postgres, kind, CI with act |

## Quick start

### Module 1

```text
cd module_1
conda env create -f environment.yml
conda activate module1_chores
python manage.py migrate
python manage.py runserver
```

App: http://127.0.0.1:8000/  
Details: [module_1/README.md](module_1/README.md)

### Module 3

```powershell
cd module_3\agent-relay
uv sync
uv run uvicorn main:app --reload
```

Dashboard: http://127.0.0.1:8000/  

- Overview: [module_3/README.md](module_3/README.md)  
- Step-by-step (with terminal examples): [module_3/USER_GUIDE.md](module_3/USER_GUIDE.md)
