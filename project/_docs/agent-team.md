# Work Planner — Agent Team

How coding agents collaborate on this certificate project. Adapted from Weekslot (`module_2`) patterns; do not edit `module_2`.

Certificate criterion: **roles + how they collaborate** (documented process agents actually follow).

## Roles

| Role | Owns | Does not own |
|------|------|--------------|
| **Spec steward** | README problem/behavior, `product-spec.md`, Issue acceptance criteria, tracker map | App implementation |
| **Frontend agent** | React UI, drag/grid, Firebase client SDK | Security rules, CI secrets |
| **Backend / data agent** | Firestore model, rules, indexes, seed scripts, Cloud Functions if any | Visual polish |
| **QA agent** | Unit + emulator integration + rules tests | Product scope changes |
| **DevOps agent** | Docker Compose, GitHub Actions; Hosting only post-submission | Feature UX |
| **On-call agent** | Wakes on `DemoSeedUnavailable`, remediates demo-seed break (`obs/`) | Spec / alert rules |

One human owner (Phani) is the product authority. Agents propose; they do not expand MVP without an Issue update.

## Collaboration

1. **Public tracker with AC:** work is filed as GitHub Issues [`work-planner` #23–#39](https://github.com/asvnphanindra/2026_AIDevToolsZoomCamp/issues?q=is%3Aissue+label%3Awork-planner). Each issue body has acceptance criteria; short map in [task-tracker.md](task-tracker.md). Every PR names Issue number + US-* id.
2. **Context entry:** read [AGENTS.md](AGENTS.md) first (root pointer: [`../AGENTS.md`](../AGENTS.md)), then the modular doc for your role (process, architecture, observability, …).
3. **Spec before code:** behavior changes update FUNCTIONAL_SPEC / `product-spec.md` (and Issue AC when needed) in the same PR as code, or earlier. Spec steward confirms AC still match.
4. **Small PRs:** one Issue (or tightly related slice) per PR; commit and push regularly.
5. **QA gate:** QA runs one-command tests (`npm test`) against Auth+Firestore emulators before merge; CI re-runs on PR.
6. **DevOps gate:** Compose / workflow changes stay with DevOps; Hosting deploy waits until after course submission ([plan.md](plan.md)).
7. **No secrets:** never commit `.env`, service accounts, or `seed/personal/`.
8. **Demo vs personal:** default all work to demo seed and `work-planner-demo` project id.
9. **Handoff:** update the Issue checklist; note emulator/test/Docker commands in the PR body; on-call notes go in [observability.md](observability.md) when alert behavior changes.

## Example flow

```text
Issue picked (US-* / #N — AC in GitHub issue body; map in task-tracker.md)
  → Spec steward confirms AC match FUNCTIONAL_SPEC
  → Frontend + data agents implement on a cursor/* branch
  → QA runs npm test (unit + integration vs emulators)
  → DevOps wires Compose/CI if the change needs it
  → PR merges → Issue closed (evidence agents used the tracker)
```

## Evidence of agent use

- Issue titles/bodies carry US-* ids + AC; PRs reference `#N` + `US-*`.
- Closed FR-era Issues #13–#22 and MVP Issues #23–#39 under label `work-planner`.
- Roles above match who owns README/spec vs UI vs data vs tests vs Compose/CI vs on-call.
