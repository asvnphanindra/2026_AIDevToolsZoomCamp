# Work Planner — Process

## Working agreements

1. Prefer the simplest option that matches [product-spec.md](product-spec.md) + FUNCTIONAL_SPEC US-* AC.
2. Track work on **public** GitHub Issues [`work-planner` #23–#39](https://github.com/asvnphanindra/2026_AIDevToolsZoomCamp/issues?q=is%3Aissue+label%3Awork-planner) (AC in issue bodies; map in [task-tracker.md](task-tracker.md)).
3. Local run/test first; Firebase Hosting only after course submission ([plan.md](plan.md)).
4. Copy/adapt useful ideas from `module_2` (Weekslot); **never overwrite** `module_2`. All Work Planner files stay under `project/`.
5. English docs. IST for all user-facing times.
6. Commit and push on meaningful chunks; open PRs against `master` that name Issue `#N` + `US-*`.
7. One clarifying question at a time when blocked.
8. Collaboration roles: [agent-team.md](agent-team.md). Context entry: [AGENTS.md](AGENTS.md).

## Definition of done (feature)

- Linked US-* backlog AC checked (GitHub issue + `_docs/task-tracker.md`)
- Tests added/updated when code exists (`npm test`)
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
docker compose up --build   # app + Auth/Firestore + Grafana LGTM + obs/on-call
```

Observability demo: [`observability.md`](observability.md) · `curl.exe -X POST http://127.0.0.1:8090/demo/alert -H "content-type: application/json" -d "{\"autoRemediate\":true}"`

CI on PR: repo workflow `.github/workflows/work-planner-ci.yml` (install + `npm test` in `project/`).
