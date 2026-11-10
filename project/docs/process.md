# Work Planner — Process

## Working agreements

1. Prefer the simplest option that matches [product-spec.md](../product-spec.md).
2. Section A = docs + tracker only. No app scaffold until Section B is assigned.
3. Copy/adapt useful ideas from `module_2` (Weekslot); **never overwrite** `module_2`.
4. English docs. IST for all user-facing times.
5. Commit and push on meaningful chunks; open PRs against `master`.
6. One clarifying question at a time when blocked.

## Definition of done (feature)

- Linked GitHub Issue AC checked
- Tests added/updated when code exists
- No personal data in the change
- `AGENTS.md` / modular docs updated if process or architecture changed

## Commands (planned; Section B+)

```powershell
cd project
npm install          # or lockfile equivalent
npm run emulators    # Firebase Emulator Suite
npm test             # unit + integration
docker compose up --build
```

Exact scripts land with the scaffold.
