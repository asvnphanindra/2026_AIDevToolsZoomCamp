# Final Project — AI Dev Tools Zoomcamp 2026

Workspace for the [course final project](https://github.com/DataTalksClub/ai-dev-tools-zoomcamp/tree/main/project): one full-stack app taken from idea → spec → build → test → containerize → deploy → observe → on-call agent.

**Pass bar:** 10 / 24 points across 12 criteria · **Peer reviews:** evaluate 3 other projects (required)  
**Platform:** https://courses.datatalks.club/ai-dev-tools-2026/

## Problem

> TODO: replace this section. Reviewers need a clear description of the problem, what the system does, and expected behavior (2 pts).

**Working title:** _(name your app)_

**Who it is for:** _(primary user)_

**Core behavior:**

- _(happy path 1)_
- _(happy path 2)_
- _(happy path 3)_

**Non-goals:** _(what you deliberately skip)_

## Planned layout

```text
project/
├── README.md              ← problem + how to run (you are here)
├── product-spec.md        ← spec + acceptance criteria
├── AGENTS.md              ← durable agent context + links to modular docs
├── docs/                  ← process, agent team, AI usage notes
├── frontend/
├── backend/
├── openapi.yaml
├── docker-compose.yml
├── tests/
└── .github/workflows/     ← CI/CD
```

Exact stack is up to you (Python is common in the course, not required).

## Criteria checklist

| Criterion | Target | Status |
|-----------|--------|--------|
| Problem description | Clear problem, functionality, expected behavior | ☐ |
| Product specification | Spec + public task tracker with acceptance criteria | ☐ |
| Agent team specification | Roles and how they collaborate | ☐ |
| Context management | `AGENTS.md` + modular docs | ☐ |
| Application | Frontend + backend + DB, one-command local run | ☐ |
| Testing | Unit + integration, one-command, passing | ☐ |
| Containerization | Full stack via Docker Compose, one command | ☐ |
| Deployment | Public URL or clear demo | ☐ |
| CI/CD | Tests on PR; deploy pipeline (bonus: manual prod) | ☐ |
| Observability | Metrics + traces + structured logs sharing a trace ID | ☐ |
| Alerting on user impact | At least one actionable alert | ☐ |
| On-call agent | Agent wakes on alert and remediates | ☐ |

## Quick start

Once the app exists:

```powershell
cd project
docker compose up --build
```

Document the real commands here (and any env vars) before submission.

## Links

- Official requirements: https://github.com/DataTalksClub/ai-dev-tools-zoomcamp/blob/main/project/README.md  
- Course repo: https://github.com/DataTalksClub/ai-dev-tools-zoomcamp  
- This zoomcamp workspace: [../README.md](../README.md)
