# Homework 3: Containerize and Deploy — Plan

## Goal

Deploy **Agent Relay** (agent messaging system) end-to-end: run locally → integration test → Docker → Compose + PostgreSQL → kind/Kubernetes → CI with act. Everything runs on the machine; no cloud account or LLM API key required.

## Decisions

| Topic | Choice |
| --- | --- |
| Project location | `module_3/agent-relay/` (repo lives inside `module_3`) |
| Source | Clone upstream (or create a fork) when we start |
| Docs | This folder: `module_3/_docs/` |

## Source

- Upstream starter: https://github.com/alexeygrigorev/agent-relay
- Course homework: https://github.com/DataTalksClub/ai-dev-tools-zoomcamp/blob/main/cohorts/2026/homework/03-deployment/homework.md
- Submit on: https://courses.datatalks.club/ai-dev-tools-2026/homework/hw3

## What Agent Relay is

- Agents send tasks; workers claim tasks; workers acknowledge results.
- Messages and delivery attempts live in a database.
- A small dashboard shows the message lifecycle.
- Starter already includes API + dashboard.

---

## Steps (do not implement until instructed)

### 0. Bootstrap

1. Fork and/or clone Agent Relay into `module_3/agent-relay/`.
2. Install/verify tools as needed (Python, Docker, kind, kubectl, act).
3. Run the project locally and skim structure + `SPEC.md`.

### 1. Understand the project (Q1)

- Run the app; explore how agents and tasks work.
- **Architecture answer (expected):** agents claim tasks from a DB through an HTTP API (not direct peer exchange, not a message broker, not browser-executed tasks).

### 2. Register agents and test the task flow (Q2)

1. Follow the first acceptance scenario in `SPEC.md`: register two agents, exchange a task and its result.
2. Confirm in the dashboard.
3. Turn that flow into an **API integration test** against the real API + DB; run it and confirm it passes.
4. Note which status the sender sees after the recipient submits the result (`queued` / `processing` / `completed` / `delivered`).

### 3. Containerization (Q3)

1. Add a `Dockerfile`.
2. Build image as `agent-relay:local`.
3. Run with API port published; use uvicorn `--host 0.0.0.0` inside the container.
4. Repeat the Q2 task flow against the containerized API.
5. **Port publish answer (expected):** `-p`.

### 4. Docker Compose + PostgreSQL (Q4)

1. Replace SQLite with PostgreSQL.
2. Add `compose.yaml` with services for the app and DB; name the DB service `postgres`.
3. `docker compose up --build`.
4. Run the Q2 integration test against Compose; confirm data is in PostgreSQL.
5. **DB hostname inside Compose (expected):** `postgres` (service name), not `localhost`.

### 5. Deploy to Kubernetes with kind (Q5)

1. Install kind + kubectl if needed; create a local kind cluster.
2. Add manifests under `k8s/` for Agent Relay + PostgreSQL (Services, persistent DB storage, readiness checks).
3. Load `agent-relay:local` (or tagged image) into kind; apply manifests.
4. Wait for pods ready; port-forward; verify Q2 task flow in the dashboard.
5. **Replicas/updates answer (expected):** `Deployment`.

### 6. CI/CD (Q6)

1. Add `.github/workflows/ci.yml` that:
   - runs starter tests + our integration test against PostgreSQL;
   - builds a Docker image;
   - deploys to kind **only if tests pass**.
2. Run the workflow locally with [act](https://nektosact.com/); configure Docker + kind access; load image into kind; unique tag per version; wait for rollout.
3. Change dashboard heading to `Agent Relay v2`; re-run workflow; confirm tests pass and new heading appears.
4. **On test failure (expected):** keep the existing version running and stop the deployment.

### 7. Submit & learn in public

- Answer Q1–Q6 on the course platform.
- Optional: share repo + screenshots/logs (no secrets) — LinkedIn/X examples are in the homework.

---

## Working notes

- Prefer small, verifiable increments: each step ends with a passing test or a visible dashboard check.
- Clone path: `module_3/agent-relay/`
- Installed locally as needed: Docker Desktop, kind, kubectl, act.
- `act -j test` runs the CI test job (Postgres service). Kind deploy steps run on the host (where the kind cluster lives) with unique image tags + `kind load` + rollout.
- Avoid leaving a host uvicorn on `:8000` while Compose/kind port-forward uses the same port.

## Homework answers

| Q | Topic | Answer | Verified? |
| --- | --- | --- | --- |
| 1 | Architecture | Agents claim tasks from a DB through an HTTP API | yes |
| 2 | Sender status after result | `completed` | yes |
| 3 | Publish container port | `-p` | yes |
| 4 | Compose Postgres hostname | `postgres` | yes |
| 5 | Keeps replicas / manages updates | `Deployment` | yes |
| 6 | If a test fails | Keep the existing version running and stop the deployment | yes (workflow `needs: test` + `if: success()`) |
