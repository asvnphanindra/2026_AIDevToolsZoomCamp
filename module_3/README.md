# Module 3 — Containerize and Deploy

Homework 3 for [AI Dev Tools Zoomcamp](https://github.com/DataTalksClub/ai-dev-tools-zoomcamp): take **Agent Relay**, run it locally, then ship it with Docker, Compose + PostgreSQL, kind/Kubernetes, and CI.

## Layout

```text
module_3/
├── README.md                 ← you are here
├── USER_GUIDE.md             ← step-by-step guide (+ screenshot placeholders)
├── _docs/
│   ├── plan.md               ← homework plan + verified answers
│   └── images/               ← screenshots go here later (not captured yet)
└── agent-relay/              ← the application
    ├── SPEC.md
    ├── Dockerfile
    ├── compose.yaml
    ├── k8s/all.yaml
    └── .github/workflows/ci.yml
```

## What Agent Relay does

Software agents register over HTTP, send tasks, claim work from a database-backed queue, and return results. A small dashboard shows the lifecycle. No cloud account, LLM key, or external message broker is required.

## Homework flow (short)

1. Run locally with `uv` + uvicorn  
2. Register agents, exchange a task, add an integration test  
3. Build/run `agent-relay:local` with Docker (`-p` publishes the port)  
4. Run API + PostgreSQL with `docker compose` (DB hostname: `postgres`)  
5. Deploy to a local kind cluster (`Deployment` manages replicas)  
6. CI with GitHub Actions / `act` — deploy only if tests pass  

Verified multiple-choice answers live in [`_docs/plan.md`](_docs/plan.md).

## Quick start

See **[USER_GUIDE.md](USER_GUIDE.md)** for install steps and full commands.

```powershell
cd module_3/agent-relay
uv sync
uv run uvicorn main:app --reload
# Dashboard: http://127.0.0.1:8000/
```

## Links

- Upstream starter: https://github.com/alexeygrigorev/agent-relay  
- Course homework: https://github.com/DataTalksClub/ai-dev-tools-zoomcamp/blob/main/cohorts/2026/homework/03-deployment/homework.md  
- Submit: https://courses.datatalks.club/ai-dev-tools-2026/homework/hw3  
