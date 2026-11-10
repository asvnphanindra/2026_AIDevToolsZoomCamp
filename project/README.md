# Work Planner

Single-user personal planner: 3-day time grid, energy bands, drag tasks onto blocks, daily minimums, Done / Partly / Not done check-ins, and weekly → longer horizons. Demo uses fictional seed only.

**Course:** AI Dev Tools Zoomcamp 2026 — final project  
**Stack:** React + TypeScript · **Firebase Auth (Google)** · **Cloud Firestore** · Emulators for local/CI  
**Deploy:** local-first; **Firebase Hosting only after course submission** ([`_docs/plan.md`](_docs/plan.md))

## Problem

Static calendars show *what* is planned, not whether it got done, whether the slot fits energy, or how today connects to weekly/monthly goals. Hand re-planning after holidays or one-off changes is painful.

## Features (MVP — US-A1…US-F2)

Issues **[#23–#39](https://github.com/asvnphanindra/2026_AIDevToolsZoomCamp/issues?q=is%3Aissue+label%3Awork-planner)** · map in [`_docs/task-tracker.md`](_docs/task-tracker.md)

- Sign-in + demo mode (US-A1, A2)
- 3-day grid, energy bands, seeded fixed schedule, day types, one-offs (US-B1–B5)
- Tasks, drag/move/resize, daily minimums (US-C1–C3)
- Check-in + replan (US-D1, D2)
- Focus panel, weekly goals, 3-week view (US-E1–E3)
- 3-month calendar + recurring series (US-F1, F2)

## Expected behavior

1. Google sign-in (or Try demo → anonymous + sample data).
2. See today + next 2 days with routines, fixed schedule, and blocks.
3. Add a task → drag onto the grid → move/resize; conflicts warn.
4. After a block ends → Done / Partly / Not done; unfinished returns to backlog.
5. Missing daily minimum → badge + suggested slot (never auto-placed).
6. Weekly goals with one-click carry-over; 3-week and calendar views for what’s ahead.

## Non-goals (MVP)

Phase 2 US-* (break-down/roll-up, digests, push, PNG export, schedule import UI) · multi-user sharing · Hosting before submission

## Docs

```text
project/
├── README.md          ← you are here
├── AGENTS.md          → _docs/AGENTS.md
└── _docs/
    ├── FUNCTIONAL_SPEC_grok_bot.md   ← user stories + full AC
    ├── product-spec.md
    ├── task-tracker.md               ← Issues #23–#39
    ├── plan.md · agent-team.md · process.md · architecture.md
    └── AGENTS.md
```

| Criterion | Status |
|-----------|--------|
| Problem / features / behavior | ☑ |
| Spec + public tracker (#23–#39) | ☑ |
| Agent team + `AGENTS.md` | ☑ |
| App / tests / Docker / CI / obs | ☐ local-first next |
| Hosting URL | ☐ after submission |

## Quick start

Docs only until Section B:

```powershell
cd project
# Spec: _docs/FUNCTIONAL_SPEC_grok_bot.md · Tracker: _docs/task-tracker.md
```

Later: `docker compose up --build` → Firebase Emulators + demo seed.

## Links

- [FUNCTIONAL_SPEC](_docs/FUNCTIONAL_SPEC_grok_bot.md) · [product-spec](_docs/product-spec.md) · [task-tracker](_docs/task-tracker.md) · [plan](_docs/plan.md) · [AGENTS](_docs/AGENTS.md) · [agent-team](_docs/agent-team.md)
