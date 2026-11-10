# Work Planner — Product Specification

**Status:** Synced to [FUNCTIONAL_SPEC_grok_bot.md](FUNCTIONAL_SPEC_grok_bot.md) v1.0 (user stories)  
**Backlog:** [task-tracker.md](task-tracker.md) — GitHub Issues **#23–#39** (US-A1…US-F2); #13–#22 closed  
**Stack (locked):** Firebase Authentication (Google) · Cloud Firestore · React + TypeScript · Emulator Suite for local/CI. **Firebase Hosting** is the intended production host, but deploy is **after course submission** (local run/test first — [plan.md](plan.md)).

## 1. Problem

People juggling several roles (work, study, family, side projects) need more than a static calendar: energy-aware placement, daily minimums, post-block check-ins, and links from day work to longer horizons. Work Planner is a single-user personal planner (demo reviewers see sample data only).

## 2. Key concepts

| Concept | Meaning |
|---------|---------|
| Life area | User-defined category + colour (defaults: Work, Study, Family, Passion) |
| Task | Title, area, duration, priority, optional due, status |
| Time block | Task on a date with start–end |
| Routine | Repeating grey fixed block (meals, commute, sleep) |
| Fixed schedule | Weekly commitment (class/meeting/lab), seeded in MVP |
| Day type | Normal / Holiday / No-fixed-schedule / Online / Exam |
| Energy band | High / Medium / Low for a time range |
| Goal | Week / month / quarter outcome; optional parent |
| Event | Dated deadline, exam, appointment, or series |

## 3. MVP user stories (source of truth)

Agents implement **MVP** only unless a Phase 2 item is explicitly prioritized. Full AC: [FUNCTIONAL_SPEC_grok_bot.md](FUNCTIONAL_SPEC_grok_bot.md) §4. Short AC: [task-tracker.md](task-tracker.md).

| ID | Title (short) |
|----|----------------|
| US-A1 | Sign in (Google / Firebase Auth; owner-only rules) |
| US-A2 | Demo mode (anonymous + fictional seed) |
| US-B1 | 3-day hourly grid |
| US-B2 | Energy bands + deep-work warning |
| US-B3 | Fixed schedule from seed |
| US-B4 | Mark special day types |
| US-B5 | One-off schedule changes |
| US-C1 | Capture tasks to backlog |
| US-C2 | Drag / move / resize on grid + conflict warn |
| US-C3 | Daily minimum rules (suggest, never auto-place) |
| US-D1 | Done / Partly / Not done after block end |
| US-D2 | Replan unfinished → backlog |
| US-E1 | Focus panel by life area |
| US-E2 | Weekly goals + carry-over |
| US-E3 | 3-week view (no clock times required) |
| US-F1 | 3-month mini calendar markers |
| US-F2 | Recurring series (expand on read) |

**Phase 2:** US-C4, D3, D4, E4–E6, F3, G1 (+ PNG export, schedule import UI).

## 4. Firestore shape (`users/{uid}/…`)

`areas`, `bands`, `routines`, `schedule`, `dayTypes`, `scheduleChanges`, `tasks`, `blocks`, `goals`, `focusItems`, `rules`, `events`, `series`, `logs` — fields in FUNCTIONAL_SPEC §6.

- Dates `YYYY-MM-DD`, times `HH:mm`, timezone per user (default `Asia/Kolkata` for primary persona).
- Demo project + `seed/demo`; personal seed gitignored.

## 5. Privacy

- Demo Firebase project (repo default) vs personal (owner only).
- No personal data in git, screenshots, or demo.
- Reviewers: anonymous / demo auth only.

## 6. Local / Docker / Hosting

- **Before course submission:** Emulator Suite + Docker Compose for local run/tests/review; CI against emulators. **No Hosting deploy required.**
- **After course submission:** optional `firebase deploy` to Hosting (Spark demo) for a public URL.
- Do not block MVP on cloud Hosting.

## 7. Decisions (locked)

1. Fixed schedule seeded (no import UI in MVP).
2. Reminders: Phase 2; in-app while open only on Spark.
3. Single user per account.
4. Horizons: 3-day + 3-week MVP; month/quarter Phase 2 (`horizon` / `period` / `parentId` in model now).
5. Firebase Auth + Firestore; Hosting only after course submission.
6. Local run/test first ([plan.md](plan.md)).
7. **FUNCTIONAL_SPEC US-\* + this product-spec** are MVP source; public tracker = Issues #23–#39 in `task-tracker.md` (no Phase 2 Issues unless asked).
