# Work Planner — Task Tracker (markdown backlog)

**Source of truth for AC detail:** [FUNCTIONAL_SPEC_grok_bot.md](FUNCTIONAL_SPEC_grok_bot.md) v1.0  
**Product summary:** [product-spec.md](product-spec.md) · **Build order:** [plan.md](plan.md)

## Policy

- **Do not create new GitHub Issues** for Work Planner unless the owner explicitly asks.
- Old GitHub Issues **#13–#22** (`work-planner`) are **closed**; this file is the active backlog.
- Agents implement only items listed under **MVP backlog** below.
- Local run/test first; Firebase Hosting only **after course submission**.

## Closed GitHub Issues (historical)

#13–#22 — FR-era tracker; superseded by US-* list below.

## MVP backlog (replacement issue list)

Use these titles + AC when opening work (chat / Project board / later Issues if requested).

### 1. `[WP] US-A1 Sign in (Google + owner rules)`
- AC: Firebase Google sign-in; Firestore reads/writes only under signed-in `uid`; sign-out clears view.

### 2. `[WP] US-A2 Demo mode (anonymous + seed)`
- AC: “Try demo” anonymous auth loads fictional seed; no personal data/keys in repo.

### 3. `[WP] US-B1 3-day hourly grid`
- AC: Today + next 2 days; configurable hours (default 06:00–23:00), 30-min rows; today highlighted; area colours; last-updated in user TZ.

### 4. `[WP] US-B2 Energy bands`
- AC: Configurable high/medium/low strips; warn when deep-work task lands in a low band.

### 5. `[WP] US-B3 Fixed schedule from seed`
- AC: Seeded weekly commitments appear on matching weekdays; no edit UI in MVP; respect day types.

### 6. `[WP] US-B4 Special day types`
- AC: Holiday / No-fixed-schedule / Online / Exam behave per FUNCTIONAL_SPEC; day header shows label.

### 7. `[WP] US-B5 One-off schedule changes`
- AC: Substitute/extra/cancel for one date only; ask replace vs extra on overlap.

### 8. `[WP] US-C1 Capture tasks`
- AC: Add/edit/delete task (title, area, duration, priority, optional due); new tasks → backlog.

### 9. `[WP] US-C2 Drag / move / resize + conflicts`
- AC: Drop creates block; move/resize update; overlaps warn with shorten/move options.

### 10. `[WP] US-C3 Daily minimum rules`
- AC: Configurable area + min minutes/day; missing day shows badge; suggest slot, never auto-place without confirm.

### 11. `[WP] US-D1 Block check-in`
- AC: After end time ask Done / Partly / Not done; nothing auto-done; partly asks remaining time.

### 12. `[WP] US-D2 Replan unfinished`
- AC: Partly / not done return to backlog with replan flag (+ remaining time).

### 13. `[WP] US-E1 Focus panel`
- AC: One column per life area with standing focus items.

### 14. `[WP] US-E2 Weekly goals + carry-over`
- AC: Starred goals for ISO week + area; unfinished carry to next week in one click.

### 15. `[WP] US-E3 3-week view`
- AC: Current week + next two as columns; tasks on a day or “sometime this week” (no clock required).

### 16. `[WP] US-F1 3-month calendar`
- AC: Coloured markers by event kind; current week highlighted; upcoming list below.

### 17. `[WP] US-F2 Recurring series`
- AC: Rule-based series expanded on read (not many stored copies).

## Phase 2 (not MVP)

US-C4, US-D3, US-D4, US-E4, US-E5, US-E6, US-F3, US-G1 (+ PNG export, schedule import UI).

## Evidence (agents / course)

- Closed Issues #13–#22 show prior public tracker use.
- This markdown backlog + FUNCTIONAL_SPEC US-* AC is what agents follow next.
- Collaboration: PRs reference a backlog item id (`US-B1`, etc.) in title/body ([agent-team.md](agent-team.md)).
