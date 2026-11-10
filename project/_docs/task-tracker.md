# Work Planner — Public Task Tracker

**Tracker:** GitHub Issues in [asvnphanindra/2026_AIDevToolsZoomCamp](https://github.com/asvnphanindra/2026_AIDevToolsZoomCamp/issues?q=is%3Aissue+label%3Awork-planner)  
**Labels:** `work-planner` · `mvp` · `section-a`  
**Product AC summary:** [product-spec.md](product-spec.md) · **Build order:** [plan.md](plan.md)

## Setup notes (agents)

1. Filter issues: `label:work-planner`.
2. Every implementation PR references one Issue and checks off its acceptance criteria in the Issue body.
3. Do not invent scope outside open Issues; open a new Issue (with AC) first if needed.
4. Prefer Issues over a GitHub Project board for MVP (board optional later).
5. Local run/test Issues come before any Hosting deploy Issue (Hosting = post-submission).

## MVP issues (acceptance criteria on each)

| # | Title |
|---|--------|
| [#22](https://github.com/asvnphanindra/2026_AIDevToolsZoomCamp/issues/22) | Day / week grid (FR-1..3, FR-5) |
| [#13](https://github.com/asvnphanindra/2026_AIDevToolsZoomCamp/issues/13) | Tasks CRUD + drag/move/resize + conflicts (FR-7..9) |
| [#14](https://github.com/asvnphanindra/2026_AIDevToolsZoomCamp/issues/14) | Daily PhD deep-focus suggestion (FR-12, FR-14) |
| [#15](https://github.com/asvnphanindra/2026_AIDevToolsZoomCamp/issues/15) | Done / Partly / Not done + replan (FR-15..16) |
| [#16](https://github.com/asvnphanindra/2026_AIDevToolsZoomCamp/issues/16) | Focus Tasks + weekly goals (FR-19..20) |
| [#17](https://github.com/asvnphanindra/2026_AIDevToolsZoomCamp/issues/17) | Seeded timetable + day types (FR-22, FR-24) |
| [#18](https://github.com/asvnphanindra/2026_AIDevToolsZoomCamp/issues/18) | 3-month calendar markers (FR-26) |
| [#19](https://github.com/asvnphanindra/2026_AIDevToolsZoomCamp/issues/19) | 3-day + 3-week horizons (FR-34..35) |
| [#20](https://github.com/asvnphanindra/2026_AIDevToolsZoomCamp/issues/20) | Auth + Firestore owner rules + IST (NFR-2,3,5) |
| [#21](https://github.com/asvnphanindra/2026_AIDevToolsZoomCamp/issues/21) | Section A meta (docs + tracker) |

## Evidence agents can use the tracker

- Issues created by the Section A agent with checklist AC in the body.
- This file links Issues ↔ `product-spec.md` so agents have a single query (`label:work-planner`).
- Collaboration rule in [agent-team.md](agent-team.md): “Every PR references an Issue.”
- Comment on [#21](https://github.com/asvnphanindra/2026_AIDevToolsZoomCamp/issues/21) records that agents must read Issue AC before coding (Section B+).

## How to add work

```powershell
# From repo root — body file avoids shell quoting issues
gh issue create --repo asvnphanindra/2026_AIDevToolsZoomCamp `
  --title "[WP] short title" `
  --body-file path/to/body.md `
  --label "work-planner,mvp"
```
