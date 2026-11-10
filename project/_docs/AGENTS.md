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

Read [product-spec.md](product-spec.md) before changing behavior. MVP:

- Firebase Auth (Google) + Firestore; local emulators first (Hosting after submission — [plan.md](plan.md))
- Day / 3-day grid + thin week + 3-week goals; drag tasks to blocks
- Done / Partly / Not done; life areas; seeded timetable; day types
- Demo seed only in public paths

Do not add Phase 2 features (month/quarter break-down, push digests, PNG export) unless an Issue is opened and prioritized.

## Modular docs (same folder)

| Doc | Use when |
|-----|----------|
| [plan.md](plan.md) | Build order: local first, Hosting after submission |
| [process.md](process.md) | How to work, DoD, planned commands |
| [agent-team.md](agent-team.md) | Roles and collaboration |
| [architecture.md](architecture.md) | Stack and data boundaries |
| [task-tracker.md](task-tracker.md) | Public Issues + acceptance criteria + evidence |

## Working agreements

1. Prefer the simplest option that matches `product-spec.md`.
2. Track work in public GitHub Issues (`work-planner` label); put AC on the Issue.
3. Adapt patterns from `../../module_2` — never modify `module_2` for this project.
4. No secrets, no personal seed, no real PII in git.
5. Commit and push regularly; small PRs linked to Issues.
6. Section A is docs-only — do not scaffold the app until Section B is assigned.
7. Keep markdown (except README) under `_docs/`.

## Source draft

Detailed FR list and Firestore field tables: [FUNCTIONAL_SPEC_grok_bot.md](FUNCTIONAL_SPEC_grok_bot.md). If draft and `product-spec.md` disagree, **product-spec + Issue AC win** for MVP; update the draft in the same change set.
