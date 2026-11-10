# AGENTS.md — Work Planner (`project/`)

Instructions for coding agents in this certificate project. Root [`../AGENTS.md`](../AGENTS.md) points here.

## Layout

```text
README.md        # problem, features, expected behavior (project root)
AGENTS.md        # short pointer at project root
/_docs           # all other markdown (this folder)
  AGENTS.md      # this file
  product-spec.md
  plan.md, process.md, agent-team.md, architecture.md, task-tracker.md
  FUNCTIONAL_SPEC_grok_bot.md
```

App folders (`frontend/`, Firebase config, Docker, tests) arrive in Section B+.

## Product scope

Read [product-spec.md](product-spec.md) and [FUNCTIONAL_SPEC_grok_bot.md](FUNCTIONAL_SPEC_grok_bot.md) before changing behavior. MVP = US-A1, A2, B1–B5, C1–C3, D1, D2, E1–E3, F1, F2.

- Firebase Auth (Google) + Firestore; local emulators first (Hosting after submission — [plan.md](plan.md))
- 3-day grid, energy bands, seeded fixed schedule, day types, drag tasks, daily minimums, check-in/replan, focus + weekly goals, 3-week view, calendar/series
- Demo seed only in public paths

Do not add Phase 2 US-* unless explicitly prioritized in [task-tracker.md](task-tracker.md).

## Modular docs (same folder)

| Doc | Use when |
|-----|----------|
| [plan.md](plan.md) | Build order: local first, Hosting after submission |
| [process.md](process.md) | How to work, DoD, planned commands |
| [agent-team.md](agent-team.md) | Roles and collaboration |
| [architecture.md](architecture.md) | Stack and data boundaries |
| [task-tracker.md](task-tracker.md) | MVP Issues #23–#39 (US-A1…US-F2) + short AC |

## Working agreements

1. Prefer the simplest option that matches `product-spec.md` + FUNCTIONAL_SPEC US-* AC.
2. Track work via GitHub Issues `work-planner` (#23–#39) and US-* ids in `_docs/task-tracker.md`. Do not open Phase 2 Issues unless asked.
3. Adapt patterns from `../../module_2` — never modify `module_2` for this project.
4. No secrets, no personal seed, no real PII in git.
5. Commit and push regularly; small PRs that name the US-* id.
6. Keep markdown (except README) under `_docs/`.
7. If FUNCTIONAL_SPEC and product-spec disagree, update both in the same change; **US-* AC in FUNCTIONAL_SPEC win for detail**.

## Source draft

User stories + full AC + data model: [FUNCTIONAL_SPEC_grok_bot.md](FUNCTIONAL_SPEC_grok_bot.md).
