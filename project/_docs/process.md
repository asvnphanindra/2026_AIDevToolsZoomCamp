# Work Planner — Process

## Working agreements

1. Prefer the simplest option that matches [product-spec.md](product-spec.md).
2. Section A = docs + tracker only. No app scaffold until Section B is assigned.
3. Local run/test first; Firebase Hosting only after course submission ([plan.md](plan.md)).
4. Copy/adapt useful ideas from `module_2` (Weekslot); **never overwrite** `module_2`. All Work Planner files stay under `project/`.
5. English docs. IST for all user-facing times.
6. Commit and push on meaningful chunks; open PRs against `master`.
7. One clarifying question at a time when blocked.

## Definition of done (feature)

- Linked US-* backlog AC checked (`_docs/task-tracker.md`)
- Tests added/updated when code exists
- No personal data in the change
- `AGENTS.md` / modular docs updated if process or architecture changed

## Commands

```powershell
cd project
npm install
npm start            # Auth + Firestore emulators + Vite
npm test             # unit + integration (JDK 21+ for Firestore)
npm run test:unit
npm run emulators
```

CI on PR: repo workflow `.github/workflows/work-planner-ci.yml` (install + `npm test` in `project/`).
