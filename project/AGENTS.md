# AGENTS.md — Work Planner (`project/`)

Instructions for coding agents in this certificate project.

## Layout

```text
/docs            # process, agent-team, architecture, task-tracker
/_docs           # working drafts (functional spec source)
product-spec.md  # refined product + MVP acceptance summary
AGENTS.md        # this file
README.md        # problem, features, expected behavior
```

App folders (`frontend/`, Firebase config, Docker, tests) arrive in Section B+.

## Product scope

Read [product-spec.md](product-spec.md) before changing behavior. MVP:

- Firebase Auth (Google) + Firestore + Hosting
- Day / 3-day grid + thin week + 3-week goals; drag tasks to blocks
- Done / Partly / Not done; life areas; seeded timetable; day types
- Demo seed only in public paths

Do not add Phase 2 features (month/quarter break-down, push digests, PNG export) unless an Issue is opened and prioritized.

## Modular docs

| Doc | Use when |
|-----|----------|
| [docs/process.md](docs/process.md) | How to work, DoD, planned commands |
| [docs/agent-team.md](docs/agent-team.md) | Roles and collaboration |
| [docs/architecture.md](docs/architecture.md) | Stack and data boundaries |
| [docs/task-tracker.md](docs/task-tracker.md) | Public Issues + acceptance criteria + evidence |

## Working agreements

1. Prefer the simplest option that matches `product-spec.md`.
2. Track work in public GitHub Issues (`work-planner` label); put AC on the Issue.
3. Adapt patterns from `../module_2` — never modify `module_2` for this project.
4. No secrets, no personal seed, no real PII in git.
5. Commit and push regularly; small PRs linked to Issues.
6. Section A is docs-only — do not scaffold the app until Section B is assigned.

## Source draft

Detailed FR list and Firestore field tables: [`_docs/FUNCTIONAL_SPEC_grok_bot.md`](_docs/FUNCTIONAL_SPEC_grok_bot.md). If draft and `product-spec.md` disagree, **product-spec + Issue AC win** for MVP; update the draft in the same change set.
