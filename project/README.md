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
- 5-day grid with layer modes (Combined / Availability / Recurring / Scheduled / Focus); availability/energy chunks, seeded schedule
- **Scheduler** (calendar layers) and **Planner** (area cards + config icon for daily mins used in weekly retrospective, US-C3); right-click placed cards to edit / unschedule / check-in
- Planner **Goals Gantt** only (no separate Goals nav): area dropdown; short (~3w) / mid (~3m) / long (~3q) bars; **→ This week** fills the **Backlog** under the Gantt; 3-week overview shows spanning goals + cross-area clash
- Scheduler **Focus** layer: **Tasks to Focus** holds unscheduled work until drag-drop onto the calendar; **Combined** is grid-only
- Tasks, drag/move/resize (US-C1–C2)
- Check-in + replan (US-D1, D2)
- Focus panel; 3-week goals overview via Planner (US-E1, E3)
- 3-month calendar + recurring series (US-F1, F2)

## Expected behavior

1. Google sign-in (or Try demo → anonymous + sample data).
2. See today + next 2 days with routines, fixed schedule, and blocks.
3. Add a task → drag onto the grid → move/resize; conflicts warn.
4. After a block ends → Done / Partly / Not done; unfinished returns to Tasks to Focus.
5. **Planner** nav: area cards + gear (daily mins); **Goals** Gantt (area dropdown); **Backlog** under the Gantt for this week / selected area. **→ This week** adds a goal-linked card. Right-click placed cards to edit / unschedule.
6. **Scheduler** layers: **Combined** = full grid only; **Focus** = **Tasks to Focus** (unscheduled) + grid shows only after drag-drop; other layers show only that layer’s items (side panel deferred).
7. After a block ends → Done / Partly / Not done check-in (partly asks remaining minutes; never auto-done).
8. Focus view: one column per life area with standing focus items (add/edit/remove).
9. **Planner → 3-week goals overview** for current + next two ISO weeks (Gantt goals spanning each week + short-goal clash across areas).

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
| US-C1 capture tasks (Issue #30) | ☑ |
| US-C2 drag tasks onto grid (Issue #31) | ☑ |
| US-C3 daily minimum rules (Issue #32) | ☑ |
| US-D1 / US-D2 check-in + replan (#33 / #34) | ☑ |
| US-E1 Focus panel (Issue #35) | ☑ |
| US-E2 Weekly goals + carry-over (Issue #36) | ☑ |
| US-E3 3-week view (Issue #37) | ☑ |
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
2. Five columns **today−2 … today … today+2**; past two greyed; today centered.
3. Grid left / backlog right; backlog grouped **by area columns**.
4. Hover the grid → 15-minute time marker (05:00–22:00).

### Verify US-B4 seed labels (Issue #28 — no dropdown)

1. `npm start` → **Try demo**.
2. Seeded header tags: No-fixed (−1), Holiday (+1), Online (+2), Exam (+3). No day-type dropdown.
3. Holiday / No-fixed: no orange fixed items + no commute.
4. Online: grey fixed items + blue online slots; no commute.
5. Availability strip (**A**) shows energy/time chunks (not one-off punch-holes).

### Verify US-C1 (Issue #30)

1. `npm start` → **Try demo**.
2. Backlog shows seed tasks; **Add** title/area/duration/priority/due.
3. **Edit** / **Delete** a backlog row; list updates (localStorage).

### Verify US-C2 (Issue #31)

1. `npm start` → **Try demo**.
2. Layout: **week grid left**, **backlog right** (area columns); stacks grid-then-backlog on narrow screens.
3. Drag a backlog task **left onto** a day column → block appears; task leaves open backlog.
4. Drag the block to move; drag bottom handle to resize.
5. Overlap → **Shorten this** / **Shorten other** / Cancel.

### Verify US-B2 (Issue #26)

1. `npm start` → **Try demo**.
2. Energy strip (E) beside times: green high / amber medium / rose low.
3. Warning for **Deep focus write-up** in the evening low band; block outlined.
4. Google sign-in still shows the energy strip (default bands) with an empty day grid.

### Verify US-B3 (Issue #27)

1. `npm start` → **Try demo** (or Google — fixed items still load from seed).
2. Orange fixed-schedule blocks appear on matching weekdays (standup Mon, office Tue, lab Wed, …).
3. Tomorrow shows **Demo holiday** and **no** fixed-schedule items that day.
4. No schedule edit UI (seed-only). One-off punch-holes removed from the grid UI.

### Verify US-E3 (Issue #37)

1. `npm start` → **Try demo** → **Planner** → **3-week goals overview**.
2. Three columns: current ISO week + next two; seeded items on day and “sometime this week”.
3. Add a task with **Sometime this week** or **Specific day**; Done / Edit / Delete; → Week / → Day… moves placement.
4. Reload persists (`work-planner.week-horizon`). Scheduler has no day-type dropdown / one-off menu.

### Verify Goals Gantt (Planner)

1. `npm start` → **Try demo** → **Planner**.
2. Area cards stay on top; below, **Goals** uses an **Area** dropdown (not only the cards).
3. Chart shows short / mid / long bands for the selected area; Add / Edit / Delete; bar ‹ › nudges dates.
4. On a goal row, **→ This week** → jumps to **Scheduler**; backlog shows the card under the same area with a **goal** badge and current ISO week period. Button becomes **On backlog** if already added.
5. **3-week goals overview** lists spanning area goals per week and a short-goal clash banner when 2+ areas overlap.
6. Reload persists (`work-planner.area-goals` + `work-planner.backlog-tasks`).

## Links

- [FUNCTIONAL_SPEC](_docs/FUNCTIONAL_SPEC_grok_bot.md) · [product-spec](_docs/product-spec.md) · [task-tracker](_docs/task-tracker.md) · [plan](_docs/plan.md) · [AGENTS](_docs/AGENTS.md) · [agent-team](_docs/agent-team.md)
