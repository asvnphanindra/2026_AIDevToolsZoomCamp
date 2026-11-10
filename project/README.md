# Work Planner

Single-user personal planner: 3-day time grid, energy bands, drag tasks onto blocks, daily minimums, Done / Partly / Not done check-ins, and weekly → longer horizons. Demo uses fictional seed only.

**Course:** AI Dev Tools Zoomcamp 2026 — final project  
**Stack:** React + TypeScript (Vite) · **Firebase Auth (Google)** · **Cloud Firestore** · Emulators for local/CI  
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
├── package.json       ← Vite app + emulator scripts
├── firebase.json      ← Auth + Firestore emulators (no Hosting deploy yet)
├── firestore.rules    ← owner + demo stubs
├── src/               ← React UI shell (US-A1/A2 placeholders)
└── _docs/
    ├── FUNCTIONAL_SPEC_grok_bot.md
    ├── product-spec.md
    ├── task-tracker.md
    ├── plan.md · agent-team.md · process.md · architecture.md
    └── AGENTS.md
```

| Criterion | Status |
|-----------|--------|
| Problem / features / behavior | ☑ |
| Spec + public tracker (#23–#39) | ☑ |
| Agent team + `AGENTS.md` | ☑ |
| App scaffold + local emulators | ☑ |
| US-A1 / US-A2 (Issues #23 / #24) | ☑ local emulator |
| US-B1 3-day grid (Issue #25) | ☑ |
| US-B2 energy bands (Issue #26) | ☑ |
| US-B3 fixed schedule from seed (Issue #27) | ☑ |
| US-B4 special day types (Issue #28) | ☑ |
| US-B5 one-off schedule changes (Issue #29) | ☑ |
| Remaining US stories / tests / Docker / CI / obs | ☐ next |
| Hosting URL | ☐ after submission |

## Quick start (one command)

**Prerequisite:** Node ≥ 20. Firestore emulator also needs a local **JDK 21+** (`java` on PATH).

```powershell
cd project
copy .env.example .env   # first time only
npm install
npm start                # Auth emulator + Vite (reuses/frees busy ports; Vite survives emu fail)
```

- App: http://127.0.0.1:5173  
- Auth emulator: `:9099` (or `:9100+` if busy; port written to `.env.local`)  
- Full suite (Auth+Firestore, needs JDK 21+): `npm run start:full` · UI `:4000` · Firestore `:8080`

UI-only: `npm run dev` — **Try demo** still works via offline local session + fictional seed.  
Auth emulator only: `npm run emulators:auth`  
If an old emulator is stuck: stop the terminal that started it, or `npm start` will reuse/pick the next free port.

Placeholder project id: `work-planner-demo` (`.firebaserc`). Keep personal seeds out of git.

### Verify US-A1 / US-A2 (Issues #23 / #24)

1. `npm start` (JDK 21+ required for Firestore emulator).
2. **Sign in with Google** → emulator fake Google user; empty owner planner under `users/{uid}`; **Sign out** returns to the login screen (view cleared).
3. **Try demo** → anonymous auth; life areas + sample tasks from `seed/demo/fictional.json` appear.
4. Emulator UI :4000 → confirm Auth users and Firestore `users/{uid}/areas`.
5. Repo check: only fictional seed committed; `.env` / `seed/personal` git-ignored.

### Verify week grid UX

1. `npm start` → **Try demo**.
2. Seven columns **today−3 … today … today+3**; past three greyed; today centered/highlighted.
3. Rich seed: fixed schedule + blocks across the week; energy strip still works.
4. Hover the grid → 15-minute time marker (05:00–22:00).

### Verify US-B4 (Issue #28)

1. `npm start` → **Try demo**.
2. Seeded headers: No-fixed (−1), Holiday (+1), Online (+2), Exam (+3).
3. Holiday / No-fixed: no orange fixed items + no commute.
4. Online: grey fixed items + blue online slots; no commute.
5. Change a day’s dropdown → header label + grid behaviour update.

### Verify US-B5 (Issue #29)

1. `npm start` → **Try demo**.
2. Seed: brown **Doctor visit** (extra today), **Cover teaching** (sub), cancel on today−2 10:00 slot.
3. Form: pick day/kind/times → on overlap, confirm replace vs extra.
4. Cancel removes overlapping fixed items that date only.

### Verify US-B2 (Issue #26)

1. `npm start` → **Try demo**.
2. Energy strip (E) beside times: green high / amber medium / rose low.
3. Warning for **Deep focus write-up** in the evening low band; block outlined.
4. Google sign-in still shows the energy strip (default bands) with an empty day grid.

### Verify US-B3 (Issue #27)

1. `npm start` → **Try demo** (or Google — fixed items still load from seed).
2. Orange fixed-schedule blocks appear on matching weekdays (standup Mon, office Tue, lab Wed, …).
3. Tomorrow shows **Demo holiday** and **no** fixed-schedule items that day.
4. No schedule edit UI (seed-only).

## Links

- [FUNCTIONAL_SPEC](_docs/FUNCTIONAL_SPEC_grok_bot.md) · [product-spec](_docs/product-spec.md) · [task-tracker](_docs/task-tracker.md) · [plan](_docs/plan.md) · [AGENTS](_docs/AGENTS.md) · [agent-team](_docs/agent-team.md)
