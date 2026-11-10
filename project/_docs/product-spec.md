# Work Planner — Product Specification

**Status:** Section A (spec + tracker); app build is Section B+  
**Source draft:** [FUNCTIONAL_SPEC_grok_bot.md](FUNCTIONAL_SPEC_grok_bot.md)  
**Public tracker:** [task-tracker.md](task-tracker.md)  
**Stack (locked):** Firebase Authentication (Google) · Cloud Firestore · React + TypeScript · Emulator Suite for local/CI. **Firebase Hosting** remains the intended production host, but deploy is **after course submission** (local run/test first — see [plan.md](plan.md)).

## 1. Problem

Static PNG planner cannot be edited in place, has no completion history, and keeps rules in code. Work Planner is an interactive web app for one primary user (associate professor / PhD student) on laptop + phone, all times in IST.

## 2. Core concepts

| Concept | Meaning |
|---------|---------|
| Life area | Job, PhD, Family, Passion (fixed colours) |
| Task | Title, area, duration, optional due/notes, status |
| Time block | Task/routine on a date with start–end |
| Routine | Fixed grey daily items (bus, meals, sleep) |
| Class | Teaching slot from seeded timetable |
| Day type | Normal / Holiday / No classes / Online / Exam |
| Goal | Weekly (MVP) goal linked to a life area |
| Horizon | `day` / `week` (MVP); `month` / `quarter` Phase 2 |

## 3. MVP requirements (acceptance-oriented)

Each item maps to a GitHub Issue (see tracker). Agents implement only MVP unless a Phase 2 issue is explicitly pulled in.

| ID | Requirement | Acceptance criteria (summary) |
|----|-------------|-------------------------------|
| FR-1..3,5 | Day / rolling week grid 06:00–23:00, life-area colours, last-updated IST | Grid renders seed data; today highlighted; past dimmed |
| FR-7..9 | CRUD tasks; drag/move/resize blocks; conflict warn | Unit + UI: create → place → overlap warns |
| FR-12,14 | Daily 1.5 h PhD block suggested, never auto-placed without confirm | Missing day shows badge; suggest accept is one click |
| FR-15..16 | Post-end Done / Partly / Not done; replan backlog | Status prompt after end; partly/notDone → backlog + remainingMin |
| FR-19..20 | Focus Tasks + weekly goals + carry-over | Four columns; starred week goals; carry-over one click |
| FR-22,24 | Seeded timetable; day-type overrides | Seed loads classes; Holiday hides campus/bus |
| FR-26 | 3-month mini calendar markers | Markers from events seed; current week highlighted |
| FR-34..35 | 3-day + 3-week horizons; `horizon`/`period` on items | Tabs switch; period keys `YYYY-MM-DD` / `YYYY-Www` |
| NFR-2,3,5 | IST strings; Firestore under `users/{uid}`; Google auth; owner-only rules | Emulator + rules tests; no cross-uid reads |

**Phase 2 (out of MVP):** FR-36..39 break-down/roll-up, reminders/digest, PhD status generator, PNG export, bands auto-refine.

## 4. Firestore shape (under `users/{uid}/…`)

Collections (see draft §5a for fields): `areas`, `bands`, `routines`, `timetable`, `dayTypes`, `classChanges`, `tasks`, `blocks`, `goals`, `focusTasks`, `events`, `series`, `phdLogs`, `dailyLogs`.

- Dates `YYYY-MM-DD`, times `HH:mm`, timezone setting `Asia/Kolkata`.
- Demo project + `seed/demo`; personal seed gitignored.

## 5. Privacy

- Two Firebase projects: `planner-demo` (default in repo) and `planner-personal` (owner only).
- No real names, family events, or PhD notes in git or demo screenshots.
- Reviewers use demo/anonymous auth only.

## 6. Local / Docker / Hosting (planned)

- **Before submission:** local run + tests via Firebase Emulator Suite; Docker Compose for reviewers (`localhost:5000` app, `:4000` Emulator UI) + demo seed. CI runs tests against emulators.
- **After course submission:** optional `firebase deploy` to Hosting + Firestore on the Spark demo project for a public URL.
- Stack still targets Auth + Firestore (+ Hosting later); do not block MVP on cloud Hosting.

## 7. Decisions (locked)

1. Timetable seeded (no import UI in MVP).
2. Reminders: in-app while open only (Spark).
3. Single user.
4. Horizons: 3-day + 3-week MVP; month/quarter Phase 2.
5. Firebase Auth + Firestore (not Supabase); Hosting only after course submission.
6. Local run/test first (see [plan.md](plan.md)).
