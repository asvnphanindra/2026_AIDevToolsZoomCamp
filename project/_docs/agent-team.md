# Work Planner — Agent Team

How coding agents collaborate on this project. Adapted from Weekslot (`module_2`) patterns; do not edit `module_2`.

## Roles

| Role | Owns | Does not own |
|------|------|--------------|
| **Spec steward** | README, `product-spec.md`, tracker acceptance criteria | App implementation |
| **Frontend agent** | React UI, drag/grid, Firebase client SDK | Security rules, CI secrets |
| **Backend / data agent** | Firestore model, rules, indexes, seed scripts, Cloud Functions if any | Visual polish |
| **QA agent** | Unit + emulator integration + rules tests | Product scope changes |
| **DevOps agent** | Docker Compose, GitHub Actions; Hosting only post-submission | Feature UX |
| **On-call agent** (later) | Alert response + remediation | Spec changes |

One human owner (Phani) is the product authority. Agents propose; they do not expand MVP without an Issue update.

## Collaboration

1. **Single source of truth for work:** markdown backlog in [task-tracker.md](task-tracker.md) (US-* ids). Do not create GitHub Issues unless the owner asks. Every PR names a US-* id.
2. **Context entry:** read [AGENTS.md](AGENTS.md) first (root pointer: [`../AGENTS.md`](../AGENTS.md)), then the linked modular doc for your role.
3. **Spec before code:** behavior changes update FUNCTIONAL_SPEC / `product-spec.md` (and backlog AC) in the same PR as code, or earlier.
4. **Small PRs:** one Issue (or tightly related slice) per PR; commit and push regularly.
5. **No secrets:** never commit `.env`, service accounts, or `seed/personal/`.
6. **Demo vs personal:** default all work to demo seed and `planner-demo` project id.
7. **Handoff:** leave the Issue checklist updated; note emulator/test commands in the PR body.

## Example flow

```text
Backlog item picked (US-* in task-tracker.md)
  → Spec steward confirms AC match FUNCTIONAL_SPEC
  → Frontend + data agents implement on a cursor/* branch
  → QA runs one-command tests against emulators
  → DevOps wires CI if the change needs it
  → PR merges → backlog item marked done in task-tracker.md
```
