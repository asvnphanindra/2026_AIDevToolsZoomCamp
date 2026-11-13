# Work Planner

Single-user personal planner: 3-day time grid, energy bands, drag tasks onto blocks, daily minimums, Done / Partly / Not done check-ins, and weekly → longer horizons. Demo uses fictional seed only.

**Course:** AI Dev Tools Zoomcamp 2026 — final / certificate project  
**Stack:** React + TypeScript (Vite) · **Firebase Auth (Google)** · **Cloud Firestore** · Emulators for local/CI  
**Deploy:** local-first + **Firebase Hosting** → **https://samaya-scheduler.web.app** (project `samaya-scheduler`)

## Problem

Static calendars show *what* is planned, not whether it got done, whether the slot fits energy, or how today connects to weekly/monthly goals. Hand re-planning after holidays or one-off changes is painful. Work Planner makes energy-aware placement, check-ins, and horizon links part of one daily workflow.

## Features (MVP — US-A1…US-F2)

Public tracker: Issues **[#23–#39](https://github.com/asvnphanindra/2026_AIDevToolsZoomCamp/issues?q=is%3Aissue+label%3Awork-planner)** (AC in each issue body) · map in [`_docs/task-tracker.md`](_docs/task-tracker.md)

- Sign-in + demo mode (US-A1, A2)
- 5-day grid with layer modes (Combined / Availability / Recurring / Scheduled / Focus); availability/energy chunks, seeded schedule
- **Scheduler** (calendar layers) and **Planner** (area cards + config icon for daily mins used in weekly retrospective, US-C3); right-click placed cards to edit / unschedule / check-in
- Planner **Goals Gantt** only (no separate Goals nav): area dropdown; short (~3w) / mid (~3m) / long (~3q) bars; **→ This week** fills the **Backlog** under the Gantt; 3-week overview shows spanning goals + cross-area clash
- Planner **Backlog** owns Focus: weekly cards + standing focus columns (US-E1); no separate Focus nav
- Scheduler **Focus** layer: **Tasks to Focus** = same backlog queue until drag-drop onto the calendar; **Combined** is grid-only
- Tasks, drag/move/resize (US-C1–C2)
- Check-in + replan (US-D1, D2)
- 3-week goals overview via Planner (US-E3)
- 3-month calendar + recurring series (US-F1, F2)

## Expected behavior

1. Google sign-in (or Try demo → anonymous + sample data).
2. See today + next 2 days with routines, fixed schedule, and blocks.
3. Add a task → drag onto the grid → move/resize; conflicts warn.
4. After a block ends → Done / Partly / Not done; unfinished returns to Tasks to Focus.
5. **Planner** nav: area cards + gear (daily mins); **Goals** Gantt (area dropdown); **Backlog** under the Gantt for this week / selected area + **Standing focus** columns (US-E1). **→ This week** adds a goal-linked card. Right-click placed cards to edit / unschedule.
6. **Scheduler** layers: **Combined** = full grid only; **Focus** = **Tasks to Focus** (same Backlog queue) + grid shows only after drag-drop; other layers show only that layer’s items (side panel deferred).
7. After a block ends → Done / Partly / Not done check-in (partly asks remaining minutes; never auto-done).
8. **Planner → 3-week goals overview** for current + next two ISO weeks (Gantt goals spanning each week + short-goal clash across areas).
9. **Calendar** nav: this month + next two with coloured markers (deadline / exam / appointment / series), current ISO week highlighted, upcoming list below.
10. Recurring **series** are stored as rules and expanded on read (add / pause / resume on Calendar); one-offs stay separate.

## Non-goals (MVP)

Phase 2 US-* (break-down/roll-up, digests, push, PNG export, schedule import UI) · multi-user sharing · Hosting before submission

## Product specification + public tracker

| Artifact | Link |
|----------|------|
| Written product spec | [`_docs/product-spec.md`](_docs/product-spec.md) |
| Full US-* AC + data model | [`_docs/FUNCTIONAL_SPEC_grok_bot.md`](_docs/FUNCTIONAL_SPEC_grok_bot.md) |
| **Public task tracker (with AC)** | [GitHub Issues `work-planner` #23–#39](https://github.com/asvnphanindra/2026_AIDevToolsZoomCamp/issues?q=is%3Aissue+label%3Awork-planner) |
| Local issue map + short AC | [`_docs/task-tracker.md`](_docs/task-tracker.md) |
| Agent team (roles + collaboration) | [`_docs/agent-team.md`](_docs/agent-team.md) |
| Context management | [`AGENTS.md`](AGENTS.md) → [`_docs/AGENTS.md`](_docs/AGENTS.md) + modular docs |
| **Project 2 submit checklist** | [`_docs/submit-checklist.md`](_docs/submit-checklist.md) |

Agents pick Issues by `label:work-planner`, implement against the AC in the issue body, and open PRs that name `#N` + `US-*` (see agent-team evidence section).

## Certificate criteria map

Aligned with Zoomcamp project criteria (problem → on-call). Docs in English.

| Criterion | Where |
|-----------|--------|
| Problem / features / expected behavior | This README (sections above) |
| Spec + **public** tracker w/ AC + agent use | `_docs/product-spec.md` + Issues #23–#39 + `_docs/task-tracker.md` + `_docs/agent-team.md` |
| Agent team | [`_docs/agent-team.md`](_docs/agent-team.md) |
| Context: `AGENTS.md` + modular docs | [`AGENTS.md`](AGENTS.md), [`_docs/AGENTS.md`](_docs/AGENTS.md) |
| FE + BE + DB; one-command local | `npm start` (below) |
| Unit + integration tests; one command | `npm test` (below) |
| Full stack via Docker/Compose; one command | `docker compose up --build` (below) |
| Deployment | Local/Compose for review; live Hosting **https://samaya-scheduler.web.app** |
| CI/CD | [`.github/workflows/work-planner-ci.yml`](../.github/workflows/work-planner-ci.yml) tests · [`.github/workflows/work-planner-hosting-cd.yml`](../.github/workflows/work-planner-hosting-cd.yml) Hosting CD (`workflow_dispatch` + `confirm_prod=deploy`) |
| Observability (metrics + traces + logs, shared trace ID, UI) | Grafana LGTM + [`obs/`](obs/) · [`_docs/observability.md`](_docs/observability.md) |
| User-impact alert | `DemoSeedUnavailable` |
| On-call agent | `obs` wakes and remediates (Compose) |

### MVP issue checklist

| Item | Status |
|------|--------|
| US-A1 / US-A2 (#23 / #24) | ☑ local emulator |
| US-B1–B5 (#25–#29) | ☑ |
| US-C1–C3 (#30–#32) | ☑ |
| US-D1 / US-D2 (#33 / #34) | ☑ |
| US-E1–E3 (#35–#37) | ☑ |
| US-F1 / US-F2 (#38 / #39) | ☑ |
| Unit + integration (`npm test`) | ☑ |
| CI on PR | ☑ |
| Docker Compose | ☑ |
| Observability + alert + on-call | ☑ |
| Hosting URL | ☑ [https://samaya-scheduler.web.app](https://samaya-scheduler.web.app) |

## Docs layout

```text
project/
├── README.md          ← you are here
├── AGENTS.md          → _docs/AGENTS.md (+ modular index)
├── package.json       ← Vite app + emulator scripts
├── compose.yaml       ← one-command local stack (app + emulators + obs UI)
├── Dockerfile
├── obs/               ← OTel metrics/traces/logs, alert, on-call agent
├── firebase.json      ← Hosting (dist) + Firestore + Auth/Firestore emulators
├── firebase.docker.json ← same emulators bound for Compose
├── firestore.rules    ← owner + demo stubs
├── src/               ← React UI
└── _docs/
    ├── FUNCTIONAL_SPEC_grok_bot.md
    ├── product-spec.md · task-tracker.md
    ├── plan.md · agent-team.md · process.md · architecture.md
    ├── observability.md
    ├── submit-checklist.md
    └── AGENTS.md
```

## Quick start (one command)

**Prerequisites:** Node ≥ 20. Firestore emulator needs **JDK 21+**.

```powershell
# once on Windows if `java -version` fails:
winget install --id Microsoft.OpenJDK.21 -e
# open a new terminal after install so PATH picks up java

cd project
copy .env.example .env   # first time only
npm install
npm start                # Auth + Firestore + Emulator UI + Vite
```

`npm start` (`scripts/dev-start.mjs`) starts **Auth + Firestore + Emulator UI** when a JDK is found, writes ports to `.env.local`, and keeps Vite up even if the emulator exits.

| Service | Default port | Notes |
|---------|--------------|--------|
| App (Vite) | **5173** | http://127.0.0.1:5173 |
| Emulator UI | **4000** | http://127.0.0.1:4000 (`:4001+` if busy) |
| Auth emulator | **9099** | `:9100+` if busy; see `.env.local` |
| Firestore emulator | **8080** | `:8081+` if busy; see `.env.local` |

Without JDK: `npm start` falls back to Auth-only. UI-only: `npm run dev` (Try demo uses offline local session). Emulators only: `npm run emulators`.

### Browse data (Firestore)

1. `npm start` → **Try demo**.
2. Emulator UI [http://127.0.0.1:4000](http://127.0.0.1:4000) → **Firestore** → `users/{uid}/…` (+ `demo/seed`).
3. Placeholder project id: `work-planner-demo`. Keep personal seeds out of git.

## Tests (one command)

**Prerequisites:** Node ≥ 20 and **JDK 21+** (Firestore emulator for integration).

```powershell
cd project
npm install
npm test                 # unit (Vitest) + integration (Auth+Firestore emulators)
```

- `npm run test:unit` — pure planner/scheduler logic (no Java).
- `npm run test:integration` — Auth+Firestore via `firebase emulators:exec`, then Vitest.
- CI: [`.github/workflows/work-planner-ci.yml`](../.github/workflows/work-planner-ci.yml) runs `npm test` on PRs that touch `project/`.

## Docker (one command)

**Prerequisite:** Docker Desktop (or Engine + Compose v2).

```powershell
cd project
docker compose up --build
```

Starts the Vite app, Auth + Firestore emulators, Grafana LGTM (metrics/traces/logs UI), and the `obs` on-call service.

| Service | URL |
|---------|-----|
| App | http://127.0.0.1:5173 |
| Emulator UI | http://127.0.0.1:4000 |
| Auth emulator | http://127.0.0.1:9099 |
| Firestore emulator | http://127.0.0.1:8080 |
| Grafana (telemetry UI) | http://127.0.0.1:3300 |
| Obs API (alerts / on-call) | http://127.0.0.1:8090 |

Stop with Ctrl+C (or `docker compose down`). First build can take a few minutes.

## Observability / alert / on-call

Details: [`_docs/observability.md`](_docs/observability.md).

1. `docker compose up --build` → Grafana http://127.0.0.1:3300 (anonymous Admin).
2. In the app, **Try demo** — browser sends a shared `trace_id` to `obs` `/ingest` (also in DevTools console JSON).
3. Fire the user-impact alert and watch on-call remediate:

```powershell
curl.exe -X POST http://127.0.0.1:8090/demo/alert -H "content-type: application/json" -d "{\"autoRemediate\":true}"
```

(Use `curl.exe` on PowerShell; plain `curl` is often GET via `Invoke-WebRequest`. `GET /demo/alert` also works.)

4. Grafana Explore → Tempo / Loki: search the returned `traceId`. Prometheus: `work_planner_demo_seed_failures_total`, `work_planner_oncall_remediations_total`.
5. Status: http://127.0.0.1:8090/status · Alerts: http://127.0.0.1:8090/alerts

Alert **`DemoSeedUnavailable`**: Try demo seed path broken for users. On-call clears the break automatically (or `POST /oncall/wake`).

## Manual verification (optional)

### US-A1 / US-A2 (#23 / #24)

1. `npm start` → **Sign in with Google** (emulator fake user) or **Try demo** (anonymous + seed).
2. Emulator UI :4000 → Firestore `users/{uid}/…` + `demo/seed`. Sign-out clears the view.

### Week grid / layers

1. `npm start` → **Try demo** → five columns **today−2 … today+2**; backlog by area.
2. Drag backlog → grid; move/resize; conflict shorten options.
3. Scheduler layers: Combined / Focus / Availability / Recurring / Scheduled as in Expected behavior.

### Planner Goals + Backlog Focus

1. **Planner** → Goals Gantt (area dropdown) → **→ This week** → Backlog card with goal badge.
2. **Standing focus** columns under Backlog; Scheduler → Focus shows the same unscheduled queue.
3. **3-week goals overview** for spanning goals + clash banner.

### Calendar / series

1. **Calendar** → three months + markers + upcoming list.
2. Recurring series expand on read (add / pause / resume).

## Hosting (production)

| | |
|--|--|
| **Live URL** | https://samaya-scheduler.web.app |
| **Firebase project** | `samaya-scheduler` |
| **Also** | https://samaya-scheduler.firebaseapp.com |

Local/CI still use the emulator placeholder `work-planner-demo` (`VITE_USE_EMULATORS=true`). Production builds use `.env.production.local` (gitignored) with `VITE_USE_EMULATORS=false` and the real web config from Firebase Console → Project settings.

Redeploy from this machine:

```powershell
cd project
npm run build
npx firebase deploy --only hosting,firestore --project samaya-scheduler
```

**Console (one-time):** Authentication → enable **Google** (+ OAuth consent if prompted) and **Anonymous** (Try demo); confirm authorized domains include `samaya-scheduler.web.app`. Firestore DB + Hosting + rules already provisioned.

CD: Actions → **work-planner-hosting-cd** → Run workflow with `confirm_prod=deploy`. Needs repo secrets listed in that workflow file (`FIREBASE_SERVICE_ACCOUNT` + `VITE_FIREBASE_*`). Without secrets the run skips deploy and prints setup steps.

## Links

- [FUNCTIONAL_SPEC](_docs/FUNCTIONAL_SPEC_grok_bot.md) · [product-spec](_docs/product-spec.md) · [task-tracker](_docs/task-tracker.md) · [plan](_docs/plan.md) · [AGENTS](_docs/AGENTS.md) · [agent-team](_docs/agent-team.md) · [observability](_docs/observability.md) · [process](_docs/process.md) · [architecture](_docs/architecture.md) · [submit checklist](_docs/submit-checklist.md)
