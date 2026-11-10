# Work Planner — Task Tracker

**Source of truth for AC detail:** [FUNCTIONAL_SPEC_grok_bot.md](FUNCTIONAL_SPEC_grok_bot.md) v1.0  
**Product summary:** [product-spec.md](product-spec.md) · **Build order:** [plan.md](plan.md)  
**GitHub:** [label:`work-planner`](https://github.com/asvnphanindra/2026_AIDevToolsZoomCamp/issues?q=is%3Aissue+label%3Awork-planner)

## Policy

- Active MVP backlog = Issues **#23–#39** below (US-A1…US-F2).
- Do **not** open Phase 2 Issues unless the owner asks.
- Agents implement only MVP items; PRs reference the Issue + US-* id.
- Local run/test first; Firebase Hosting only **after course submission**.

## Historical (closed)

#13–#22 — FR-era tracker; superseded by US-* Issues #23–#39.

## MVP Issues

| US-* | # | Title | Short AC |
|------|---|--------|----------|
| US-A1 | [#23](https://github.com/asvnphanindra/2026_AIDevToolsZoomCamp/issues/23) | Sign in (Google + owner rules) | Firebase Google sign-in; Firestore only under `uid`; sign-out clears view |
| US-A2 | [#24](https://github.com/asvnphanindra/2026_AIDevToolsZoomCamp/issues/24) | Demo mode (anonymous + seed) | Try demo + fictional seed; no personal data/keys in repo |
| US-B1 | [#25](https://github.com/asvnphanindra/2026_AIDevToolsZoomCamp/issues/25) | 3-day hourly grid | Today+2; default 06:00–23:00; colours; last-updated TZ |
| US-B2 | [#26](https://github.com/asvnphanindra/2026_AIDevToolsZoomCamp/issues/26) | Energy bands | Configurable strips; warn deep-work in low band |
| US-B3 | [#27](https://github.com/asvnphanindra/2026_AIDevToolsZoomCamp/issues/27) | Fixed schedule from seed | Seeded weeklies; no edit UI MVP; respect day types |
| US-B4 | [#28](https://github.com/asvnphanindra/2026_AIDevToolsZoomCamp/issues/28) | Special day types | Holiday / No-fixed / Online / Exam; header label |
| US-B5 | [#29](https://github.com/asvnphanindra/2026_AIDevToolsZoomCamp/issues/29) | One-off schedule changes | One date; ask replace vs extra on overlap |
| US-C1 | [#30](https://github.com/asvnphanindra/2026_AIDevToolsZoomCamp/issues/30) | Capture tasks | CRUD → backlog |
| US-C2 | [#31](https://github.com/asvnphanindra/2026_AIDevToolsZoomCamp/issues/31) | Drag / move / resize + conflicts | Overlap warn + shorten/move |
| US-C3 | [#32](https://github.com/asvnphanindra/2026_AIDevToolsZoomCamp/issues/32) | Daily minimum rules | Badge; suggest; never auto-place |
| US-D1 | [#33](https://github.com/asvnphanindra/2026_AIDevToolsZoomCamp/issues/33) | Block check-in | Done / Partly / Not done after end (prompt; never auto) |
| US-D2 | [#34](https://github.com/asvnphanindra/2026_AIDevToolsZoomCamp/issues/34) | Replan unfinished | Back to backlog + remaining |
| US-E1 | [#35](https://github.com/asvnphanindra/2026_AIDevToolsZoomCamp/issues/35) | Focus panel | Column per life area |
| US-E2 | [#36](https://github.com/asvnphanindra/2026_AIDevToolsZoomCamp/issues/36) | Weekly goals + carry-over | ISO week; one-click carry |
| US-E3 | [#37](https://github.com/asvnphanindra/2026_AIDevToolsZoomCamp/issues/37) | 3-week view | Week columns; day or sometime-this-week |
| US-F1 | [#38](https://github.com/asvnphanindra/2026_AIDevToolsZoomCamp/issues/38) | 3-month calendar | Markers + upcoming list |
| US-F2 | [#39](https://github.com/asvnphanindra/2026_AIDevToolsZoomCamp/issues/39) | Recurring series | Expand on read |

## Phase 2 (not filed as Issues)

US-C4, US-D3, US-D4, US-E4, US-E5, US-E6, US-F3, US-G1 (+ PNG export, schedule import UI).

## Evidence

- Closed #13–#22 (prior tracker) + open #23–#39 (US-* MVP) with AC in bodies.
- Agents: filter `label:work-planner`; PR titles include Issue number + US-* id.
