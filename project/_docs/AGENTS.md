# AGENTS.md — Work Planner (`project/`)

Instructions for coding agents on this AI Dev Tools Zoomcamp **certificate** project. Root pointer: [`../AGENTS.md`](../AGENTS.md).

## Layout

```text
README.md                 # problem, features, expected behavior, run/test/docker/obs
AGENTS.md                 # short pointer + modular doc table (project root)
package.json · compose.yaml · Dockerfile · firebase*.json · firestore.rules
src/                      # React + TypeScript UI
obs/                      # OTel ingest, alert, on-call remediation
seed/demo/                # fictional demo seed only
_docs/                    # all other markdown (this folder)
  AGENTS.md               # this file
  product-spec.md
  task-tracker.md         # → public GitHub Issues #23–#39 with AC
  agent-team.md · process.md · architecture.md · plan.md
  observability.md
  submit-checklist.md
  FUNCTIONAL_SPEC_grok_bot.md
```

## Product scope

Read [product-spec.md](product-spec.md) and [FUNCTIONAL_SPEC_grok_bot.md](FUNCTIONAL_SPEC_grok_bot.md) before changing behavior. MVP = US-A1, A2, B1–B5, C1–C3, D1, D2, E1–E3, F1, F2.

- Firebase Auth (Google) + Firestore; local emulators first (Hosting after submission — [plan.md](plan.md))
- 3-day grid, energy bands, seeded fixed schedule, day types, drag tasks, daily minimums, check-in/replan, focus + weekly goals, 3-week view, calendar/series
- Demo seed only in public paths

Do not add Phase 2 US-* unless explicitly prioritized in [task-tracker.md](task-tracker.md).

## Modular docs (same folder)

| Doc | Use when |
|-----|----------|
| [product-spec.md](product-spec.md) | Written product specification |
| [task-tracker.md](task-tracker.md) | Public tracker: Issues [#23–#39](https://github.com/asvnphanindra/2026_AIDevToolsZoomCamp/issues?q=is%3Aissue+label%3Awork-planner) + short AC |
| [agent-team.md](agent-team.md) | Roles and how agents collaborate |
| [process.md](process.md) | How to work, DoD, commands |
| [architecture.md](architecture.md) | Stack and data boundaries |
| [observability.md](observability.md) | Metrics/traces/logs, alert, on-call demo |
| [plan.md](plan.md) | Build order: local first, Hosting after submission |
| [FUNCTIONAL_SPEC_grok_bot.md](FUNCTIONAL_SPEC_grok_bot.md) | Full US-* AC + data model |
| [submit-checklist.md](submit-checklist.md) | Project 2 platform submit + peer reviews |

Human entry (problem / features / expected behavior / how to run): [`../README.md`](../README.md).

## Working agreements

1. Prefer the simplest option that matches `product-spec.md` + FUNCTIONAL_SPEC US-* AC.
2. **Public tracker:** GitHub Issues `work-planner` (#23–#39) with acceptance criteria in each issue body; map in `_docs/task-tracker.md`. Do not open Phase 2 Issues unless asked.
3. Adapt patterns from `../../module_2` — never modify `module_2` for this project.
4. No secrets, no personal seed, no real PII in git.
5. Commit and push regularly; small PRs that name the Issue number + US-* id.
6. Keep markdown (except README + root AGENTS pointer) under `_docs/`.
7. If FUNCTIONAL_SPEC and product-spec disagree, update both in the same change; **US-* AC in FUNCTIONAL_SPEC win for detail**.

## Source draft

User stories + full AC + data model: [FUNCTIONAL_SPEC_grok_bot.md](FUNCTIONAL_SPEC_grok_bot.md).
