# Work Planner — Architecture

## Stack

| Layer | Choice |
|-------|--------|
| UI | React + TypeScript (SPA) |
| Auth | Firebase Authentication — Google (demo may use Anonymous) |
| DB | Cloud Firestore (`users/{uid}/…`) |
| Host | Firebase Hosting (static build) |
| Local | Firebase Emulator Suite (+ optional Docker Compose wrapper) |
| CI | GitHub Actions against emulators (later) |

## Trust boundaries

- Security rules: only the signed-in `uid` may read/write their subtree.
- Client talks to Firestore/Auth directly for MVP; HTTPS Cloud Functions only if needed for rules the browser must not own.
- Two Firebase projects: demo (public) vs personal (private).

## Data notes

- Store dates/times as IST strings (`YYYY-MM-DD`, `HH:mm`) to avoid TZ shift bugs.
- Denormalise `areaId` (+ title) onto `blocks` for one-query grids.
- Composite indexes in `firestore.indexes.json`; rules in `firestore.rules`.

## Relation to Weekslot (`module_2`)

Reuse UI ideas (timetable grid, drag from task list). Do **not** reuse FastAPI/SQLite as the system of record — Work Planner is Firebase-first.
