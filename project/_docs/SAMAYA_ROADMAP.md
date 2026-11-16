# Samaya Scheduler: improvement roadmap

A generic, mobile-first roadmap that turns Samaya Scheduler (https://samaya-scheduler.web.app/) into a daily planner any user can configure. Every step names the files to change, why, how, when it is done, and a short, token-lean Cursor prompt. All sample data in this document is fictional.

## Contents

1. Summary
2. Project rules block
3. How to use these prompts cheaply
4. Feedback from the hands-on test
5. Hands-on test findings
6. Code review findings
7. Target features vs the app
8. Templates and a sample setup
9. Roadmap at a glance
10. Phases and steps (with Cursor prompts)
11. Next 2 weeks

## 1. Summary

The app is solid: no bugs, fast loads, and a sensible code structure with tests and emulator CI. Two things stand between it and daily use. First, a signed-in user's data lives in the browser and the grid draws demo settings. Second, the layout is built for a desktop and mouse.

> **Order of work:** Phase 0 makes the data synced and per-user. Phase 1 makes it mobile-first. Phase 2 adds setup and templates so every feature is generic.

> **Before changing anything:** grading for the course submission runs until Tue 17 Nov 2026, 4:30 AM IST. Tag the submitted commit (`git tag p2-submission`) and work on a branch, so graders see exactly what was submitted.

Effort: S is one 1.5 h session, M is one full session (up to about 3 h), and L would be more. Every former L step is split into session-sized steps, each with one outcome.

## 2. Project rules block

Save once as `.cursor/rules/samaya.mdc` (or append to `project/AGENTS.md`). The step prompts rely on it and do not repeat it.

```markdown
---
description: Samaya Scheduler project rules
alwaysApply: true
---
Workspace: open project/ so @src/... paths resolve.
Stack: React 19 + TypeScript (strict) + Vite 7; Firebase Auth (email/password, anonymous demo); Cloud Firestore; Vitest. Run: npm start (emulators). Test: npm test.
Layout: pure logic in src/lib/*.ts with *.test.ts beside it; UI in src/components/*.tsx; app state in src/components/AuthShell.tsx; styles in src/index.css; security in firestore.rules.
Data: user data under users/{uid}/...; demo (anonymous) under demo/{uid}/... only. Dates YYYY-MM-DD, times HH:mm in the user's timezone.
Generic: never hard-code a user's areas, bands, timetable, events or names; read config from users/{uid}.
Privacy: never commit personal data; use fictional seed data only.
Mobile-first: works at 360-412 px with no sideways scroll; touch targets >= 44 px; no hover-only or right-click-only actions.
Edits: change only files named in the prompt (plus files it says to create); no new dependencies unless named; keep existing tests passing; add tests for new lib logic.
Output: reply with the diff only. No explanation, no recap.
```

## 3. How to use these prompts cheaply

1. **Paste the rules block once.** Save it as `.cursor/rules/samaya.mdc` (or append to `project/AGENTS.md`). Every prompt below relies on it and does not repeat it.
2. **One new chat per step.** A fresh chat carries no old context, so each step costs only its own prompt and files.
3. **Match the model to the size.** Use a small, fast model for S steps, the default for M, and a stronger model only for L steps or debugging. Every former L step is now split into M-sized prompts.
4. **Plan mode only for L.** Use Ask or plan mode only if a step turns out larger than one session; otherwise go straight to agent edits.
5. **Verify locally.** Run `npm test` (and Playwright for UI steps) yourself instead of asking the model to verify.
6. **Commit after every step.** A failed attempt is then a cheap `git restore` or revert, not a long fix-up chat.
7. **Paste only error lines.** When something fails, paste the failing test name and error lines, not the full log.

## 4. Feedback from the hands-on test

No bugs, no errors or broken links, zero browser console errors, and pages loaded quickly. Adding, editing and deleting a test task all worked, and the Scheduler, Planner, Calendar and Activity tabs were easy to move between. Existing data was left untouched.

- **Planner page:** very rich but long and dense. Collapsible cards for areas, timetable, goals and backlog would make it easier to scan (step 1.5).
- **Calendar:** clicking a date does nothing, so it only works as an overview. Opening a day sheet would make it much more useful (step 1.6).
- **Overlaps:** clashes are highlighted, but it isn't obvious how to resolve one (steps 3.1, 4.7).
- **Check-in prompt:** it pops up on the first Scheduler view, which feels abrupt. A small pending chip and sheet would be gentler (step 1.8).
- **Activity log:** it keeps test add, edit and delete entries. Fine for an audit trail, but a filter would keep it tidy (step 3.2).
- **Mobile:** narrow screens were not tested; this is now Phase 1.
- **Demo mode** with fictional data is a nice touch for reviewers. Keep it that way (step 9.5).

## 5. Hands-on test findings

- No bugs found, zero browser console errors, and fast page loads.
- Sign-in offers email and password, Create account, and Try demo with fictional data.
- Adding, editing and deleting a test task all worked.
- Scheduler: five-day hourly grid with layer filters and a Focus panel.
- Planner: life areas, teaching timetable, goals as a Gantt timeline, weekly backlog and standing focus.
- Calendar: three months of markers, recurring series and an upcoming list.
- Activity: an append-only log of who changed what.
- Pain point: the Planner page is long and dense.
- Pain point: clicking a calendar date does nothing.
- Pain point: the way to resolve an overlap is not discoverable.
- Pain point: the check-in prompt pops up abruptly on the first Scheduler view.
- Pain point: the Activity log keeps test add, edit and delete noise.
- Not tested: phone widths.

## 6. Code review findings

From the repo's master branch.

- Personal-mode data (tasks, blocks, events, series, goals, check-ins) is stored in localStorage (`AuthShell.tsx` around line 191). Only `teachingPlans` and `activityLog` reach Firestore, so devices see different plans.
- `lib/day-grid.ts` draws `fictionalSeed` bands, schedule, day types and routines for every user (lines 90–98), and `DayGrid.tsx` line 159 passes `fictionalSeed.dayTypes`.
- Day types and one-off schedule changes use `dayOffset` relative to today, so they cannot hold real dates, and neither has a UI. `applyScheduleChanges` is unused by components.
- `lib/teaching-plan.ts` already has versioned timetables (`effectiveFrom`, `effectiveTo`, `activeTimetable`), but they are tied to the Job area and do not drive the grid.
- `components/WeeklyGoals.tsx` (★ goals, carry-over) is built but not imported anywhere.
- The five-day grid needs at least about 492 px (`index.css` around line 368), wider than a 360–412 px phone.
- Blocks and backlog rows use HTML5 drag (`draggable`, `onDragStart`) and right-click (`onContextMenu`), which do not work on Android touch.
- `index.html` has no PWA manifest or service worker, and its title is Work Planner.
- `firestore.rules` gives an allowlisted bot access only to `teachingPlans` and `activityLog`. There are no security-rules tests.
- US-C3 says daily minimums never warn while scheduling. A required daily block needs a badge, so the spec needs a soft vs required rule kind.
- Strengths: clean lib/component split, pure functions with Vitest tests, emulator-based CI, append-only audit log, demo isolated under `demo/{uid}`, and an observability stack in `obs/`.

## 7. Target features vs the app

| Target feature | App today | Step |
|---|---|---|
| Synced plan across devices | Not yet (localStorage) | 0.1, 0.2 |
| Per-user energy bands and commute slots | Demo bands for every user | 0.5, 4.1, 4.2 |
| Phone layout and touch editing | Desktop and mouse only | 1.1–1.8 |
| Timetable switch on a date | Versions exist, not on the grid | 6.1 |
| Rotating timetables | Not supported | 6.2 |
| Holidays, online days, exams, leave | Offset-based, no UI | 6.3 |
| Substitute or extra sessions | Logic exists, no UI | 6.4 |
| Recurring personal items on the day | Calendar markers only | 6.6 |
| ★ week goals | Built but not shown | 5.5 |
| Clickable calendar dates | Not clickable | 1.6 |
| Check-ins and replanning | Built, stored per browser | 0.2, 5.2, 5.3 |

## 8. Templates and a sample setup

| Template | Areas | Daily minimums | Schedule |
|---|---|---|---|
| Teacher / PhD | Research, Teaching, Passion, Family | Deep focus 90 min outside work hours, flexible 90 min | Class timetable with periods and versions |
| Student | Study, Projects, Health, Social | Study 2 h, exercise 30 min | Lecture timetable, exam periods |
| Office worker | Work, Learning, Health, Family | Focus 2 h, learning 30 min | Weekly office hours, meetings as series |
| Blank | User defined | None | None |

### E.g. a fictional Teacher / PhD setup

| Setting | Value |
|---|---|
| Template | Teacher / PhD (fictional sample) |
| Life areas | Research, Teaching, Passion, Family |
| Energy bands | High 7:00–8:00 and 9:00–12:00. Medium 13:00–16:00 and 19:30–21:00. Low otherwise. |
| Commute slots | 8:00–8:45 and 17:00–17:45 on workdays, listen or review only |
| Daily minimums | Deep focus 90 min, required, counted outside 9:00–16:30 work hours. Flexible 90 min (training, passion, family or class prep). |
| Schedule | Periods P1 9:00–9:50 to P6 15:00–15:50. Section A: Mon P1, Wed P3. Section B: Tue P2, Thu P1. Section A Lab: Fri P4–P6. Version 1 from 2027-01-04 to 2027-04-30. |
| Recurring items | Groceries Sat 10:00–11:00, vehicle service every 4 months, research progress report every 3 weeks |
| Check-ins | After every block, never assumed done, plus an evening energy tag |
| Reminders | 60 min before timed items |

A real user's configuration lives only in their own account, entered through setup or imported privately (step 2.5), and never in the repo or the demo.

## 9. Roadmap at a glance

| Step | Change | Effort |
|---|---|---|
| 0.1 | Shared store module; tasks and blocks in Firestore | M |
| 0.2 | Remaining collections and one-time localStorage import | M |
| 0.3 | Offline persistence | S |
| 0.4 | Generic per-user configuration model | M |
| 0.5 | Grid reads the user's configuration, not the fictional seed | M |
| 1.1 | Breakpoints, tokens and a bottom tab bar | M |
| 1.2 | Single-day agenda as the phone default, with swipe | M |
| 1.3 | Touch action sheet instead of drag and right-click | M |
| 1.4 | Floating add button and bottom-sheet editor | M |
| 1.5 | Collapsible Planner made of cards | S |
| 1.6 | Calendar month view: tap a date to open a day sheet | M |
| 1.7 | Readable grid scaling | S |
| 1.8 | Calm, touch-friendly check-ins | S |
| 1.9 | Installable PWA, offline shell and the product name | M |
| 1.10 | Reminders model and in-app notifications | M |
| 1.11 | Tests at phone widths | M |
| 2.1 | Setup wizard, part 1: shell, template, areas, bands, slots | M |
| 2.2 | Setup wizard, part 2: minimums, schedule, recurring, cadence, reminders | M |
| 2.3 | Templates | M |
| 2.4 | Settings screen | M |
| 2.5 | Export and import (config and data), printable week | M |
| 3.1 | Discoverable clash resolution | S |
| 3.2 | Activity log filters | S |
| 3.3 | Timezone from settings | S |
| 4.1 | Energy bands from settings | S |
| 4.2 | Task depth and slot rules (commute or low-focus slots) | M |
| 4.3 | Daily minimum blocks (soft or required) | M |
| 4.4 | Free-slot finder | M |
| 4.5 | Suggestion engine | M |
| 4.6 | One-tap suggestion chips | S |
| 4.7 | Clash resolution engine | M |
| 5.1 | Today plan header | M |
| 5.2 | Configurable check-in cadence, with notes | M |
| 5.3 | Replan into a real slot | M |
| 5.4 | End-of-day review and energy tags | M |
| 5.5 | ★ week goals | S |
| 5.6 | Periodic progress report helper | M |
| 6.1 | Timetables for any area, versioned by date | M |
| 6.2 | Any number of rotating timetables | M |
| 6.3 | Holidays and day types | M |
| 6.4 | One-off changes: substitute, extra, cancel | M |
| 6.5 | Terms and milestones | S |
| 6.6 | Recurring personal items on the grid | M |
| 7.1 | Scoped assistant access in security rules | M |
| 7.2 | Connected assistants screen | S |
| 7.3 | Calendar export (ICS) | S |
| 7.4 | Markdown and Logseq journal sync | M |
| 8.1 | Weekly review | M |
| 8.2 | Goal progress roll-up | M |
| 8.3 | Energy vs completion | M |
| 9.1 | Owner and demo security rules tests | M |
| 9.2 | End-to-end tests on desktop and phone | M |
| 9.3 | Preview deploys | S |
| 9.4 | Backups | S |
| 9.5 | Privacy guard | S |

## 10. Phases and steps

### Phase 0: Data foundation

Do this first. A signed-in user's data lives in the browser today, and the grid draws demo settings for everyone. Every later phase needs one synced, per-user data model.

#### 0.1 Shared store module; tasks and blocks in Firestore (M)

- **What to change:** In personal mode, `AuthShell.tsx` (around line 191) loads tasks, blocks and the rest from localStorage (`loadBacklog`, `readPlacedBlocks`, …). Only the teaching plan and activity log reach Firestore.
- **Why it helps:** A user's phone and laptop show different plans, and clearing the browser loses everything.
- **How to build:** Generalise `lib/demo-store.ts` (`loadDemoPlannerState`, `replaceDemoCollection`) into `lib/planner-store.ts`, taking a root of `["demo", uid]` or `["users", uid]`, with per-document `setDoc`/`deleteDoc`. Switch tasks and placed blocks to it in both modes.
- **Done when:** A task or block added on one device shows on another after a refresh. Demo still writes only to `demo/{uid}`.
- **Model:** Default model; agent mode

**Cursor prompt:**

```text
@src/lib/demo-store.ts @src/components/AuthShell.tsx @src/lib/tasks.ts @src/lib/blocks.ts
Create: src/lib/planner-store.ts
Create planner-store.ts generalising demo-store to a root of ["demo",uid] | ["users",uid] with per-doc setDoc/deleteDoc. Use it for tasks and placed blocks in both modes; demo-store re-exports from it.
Checks:
1. Personal tasks and blocks persist under users/{uid}/tasks and /blocks.
2. Demo still reads and writes only demo/{uid}.
3. Existing demo-store emulator tests pass.
Touch only these files. No new dependencies. Keep tests passing. Diff only.
```

#### 0.2 Remaining collections and one-time localStorage import (M)

- **What to change:** Areas, rules, focus items, week horizon, events, series, area goals and check-ins still use localStorage in personal mode.
- **Why it helps:** Finishes the move so nothing personal is browser-only, without losing data users already entered.
- **How to build:** Route the remaining loaders in `AuthShell.tsx` through `planner-store.ts`. On first personal sign-in, copy existing localStorage keys (for example `work-planner.check-ins`) into `users/{uid}/…`, then set a `migratedAt` flag.
- **Done when:** No personal data is read from localStorage after migration; clearing site data loses nothing.
- **Model:** Default model; agent mode

**Cursor prompt:**

```text
@src/components/AuthShell.tsx @src/lib/planner-store.ts @src/lib/checkin.ts @src/lib/calendar-events.ts @src/lib/calendar-series.ts
Create: src/lib/migrate-local.ts, src/lib/migrate-local.test.ts
Move areas, rules, focusItems, weekHorizon, events, series, areaGoals and checkIns to planner-store in personal mode. Add a one-time import of the existing localStorage keys into users/{uid}, guarded by a migratedAt flag on users/{uid}.
Checks:
1. After migration, personal mode reads none of these from localStorage.
2. Import runs once and is idempotent (unit test).
3. Demo mode unchanged.
Touch only these files. No new dependencies. Keep tests passing. Diff only.
```

#### 0.3 Offline persistence (S)

- **What to change:** `lib/firebase.ts` uses plain `getFirestore(app)`.
- **Why it helps:** People check plans on commutes with patchy signal (NFR-7), and the PWA in Phase 1 relies on this.
- **How to build:** Switch to `initializeFirestore` with `persistentLocalCache` and `persistentMultipleTabManager`, keeping `connectFirebaseEmulators` as is.
- **Done when:** In airplane mode the day still loads, and a check-in made offline syncs later.
- **Model:** Small, fast model; agent mode

**Cursor prompt:**

```text
@src/lib/firebase.ts
Replace getFirestore with initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) }). Keep the emulator hookup.
Checks:
1. App loads with emulators and in production config.
2. npm test passes.
Touch only these files. No new dependencies. Keep tests passing. Diff only.
```

#### 0.4 Generic per-user configuration model (M)

- **What to change:** Settings are spread across seed types. `SeedDayType` and `SeedScheduleChange` use `dayOffset` relative to today, so they cannot hold real dates. The teaching plan is tied to `JOB_AREA_ID` in `lib/teaching-plan.ts`.
- **Why it helps:** Every feature (bands, minimums, commute slots, timetables, holidays, cadence, reminders) needs a home any user can fill in through setup instead of code.
- **How to build:** Add `lib/config.ts` with types for `users/{uid}` settings (`timezone`, `gridStartHour`, `gridEndHour`, `daysVisible`, `checkInCadence`, `reminderDefaultMin`, `eveningReviewAt`) and the subcollections `areas`, `bands`, `slotRules`, `rules`, `schedules`, `routines`, `series`, `dayTypes/{YYYY-MM-DD}`, `scheduleChanges`, `goals`, `checkIns`, `logs`, `energyTags`. Migrate `dayOffset` to date keys and document the model in spec section 6.
- **Done when:** Every setting can be read from Firestore for any uid, and no type stores a date as an offset.
- **Model:** Default model; agent mode

**Cursor prompt:**

```text
@src/data/fictional-seed.ts @src/lib/schedule.ts @_docs/FUNCTIONAL_SPEC_grok_bot.md
Create: src/lib/config.ts, src/lib/config.test.ts
Create config.ts with typed settings and subcollection models plus load/save helpers on planner-store. Replace dayOffset with date keys (YYYY-MM-DD) in day types and schedule changes; demo seed computes dates at seed time. Update spec section 6.
Checks:
1. No type uses dayOffset.
2. Config round-trips through the emulator (test).
3. Demo seed still loads.
Touch only these files. No new dependencies. Keep tests passing. Diff only.
```

#### 0.5 Grid reads the user's configuration, not the fictional seed (M)

- **What to change:** In `lib/day-grid.ts`, `buildDayGrid` hard-codes `fictionalSeed.bands`, `.schedule` and `.dayTypes` (lines 90–98), and `expandDemoExtras` reads `fictionalSeed.routines`. `DayGrid.tsx` line 159 passes `fictionalSeed.dayTypes`.
- **Why it helps:** Otherwise every user sees demo classes and demo energy bands.
- **How to build:** Pass `bands`, `routines`, `schedules` and `dayTypes` into `buildDayGrid` from config. Use the seed only when `isDemo`, and remove seed defaults in `lib/schedule.ts`.
- **Done when:** A new account with no config shows an empty grid and a Run setup prompt, not demo classes.
- **Model:** Default model; agent mode

**Cursor prompt:**

```text
@src/lib/day-grid.ts @src/components/DayGrid.tsx @src/lib/schedule.ts @src/lib/day-grid.test.ts
Make buildDayGrid take bands, routines, schedules and dayTypes as inputs from config; fall back to fictionalSeed only when isDemo. Remove fictionalSeed defaults from schedule.ts.
Checks:
1. Personal account with empty config renders no demo items.
2. Demo renders as before.
3. day-grid tests updated and passing.
Touch only these files. No new dependencies. Keep tests passing. Diff only.
```

### Phase 1: Mobile-first layout (top priority)

Phones are where people check the day and check in. The five-day grid needs at least about 492 px (`index.css` around line 368), wider than a 360–412 px phone, and drag and right-click do not work on touch.

#### 1.1 Breakpoints, tokens and a bottom tab bar (M)

- **What to change:** `index.css` has three unrelated breakpoints (960, 900 and 640 px). Navigation is `nav.app-nav` in the header (`AuthShell.tsx` around line 686), which stacks above content on phones.
- **Why it helps:** One set of breakpoints keeps screens consistent, and thumb-reach navigation is the phone standard.
- **How to build:** Define phone (under 640 px), tablet (640–1023 px) and desktop breakpoints plus `--tap: 44px` and spacing tokens, and add a `useBreakpoint()` hook. Under 640 px render the views as a fixed bottom `tab-bar` (Today, Planner, Calendar, Activity, More) with `env(safe-area-inset-bottom)`.
- **Done when:** No sideways page scroll from 360 to 1440 px, and every view is reachable from the bottom bar on phones.
- **Model:** Default model; agent mode

**Cursor prompt:**

```text
@src/index.css @src/components/AuthShell.tsx
Create: src/hooks/useBreakpoint.ts
Add breakpoint and tap-size CSS tokens, consolidate the media queries, add useBreakpoint(). Under 640px move app-nav to a fixed bottom tab bar (44px+ targets, safe-area padding); keep header nav on larger screens.
Checks:
1. At 360px and 412px no horizontal scroll and the tab bar never covers content.
2. Each tab is at least 44×44px.
3. Desktop header nav unchanged.
Touch only these files. No new dependencies. Keep tests passing. Diff only.
```

#### 1.2 Single-day agenda as the phone default, with swipe (M)

- **What to change:** Only the multi-day `DayGrid` exists, and `weekCenteredDayKeys` in `lib/time.ts` fixes `todayIndex = 2` (five days).
- **Why it helps:** One day at a time is what fits and what people need on the go.
- **How to build:** New `DayAgenda.tsx` rendering one `dayKey` from the `buildDayGrid` model as a time list with the `NowIndicator`. Swipe with pointer events plus Prev / Today / Next buttons; default view under 640 px.
- **Done when:** On a phone the app opens to today's agenda, a swipe moves one day, and nothing scrolls sideways.
- **Model:** Default model; agent mode

**Cursor prompt:**

```text
@src/lib/day-grid.ts @src/components/NowIndicator.tsx @src/components/AuthShell.tsx @src/lib/time.ts
Create: src/components/DayAgenda.tsx
Create DayAgenda showing one day from the buildDayGrid model (schedule, routines, blocks, now line). Swipe left/right via pointer events and Prev/Today/Next buttons. Make it the default view when useBreakpoint() is phone.
Checks:
1. Phone opens to today's agenda.
2. Swipe and buttons change the day by one.
3. No horizontal scroll at 360px.
Touch only these files. No new dependencies. Keep tests passing. Diff only.
```

#### 1.3 Touch action sheet instead of drag and right-click (M)

- **What to change:** `DayGrid.tsx` uses HTML5 `draggable`/`onDragStart` (around line 961), column `onDrop` (920), `onContextMenu` (967) and a small `resize-handle` (982). Backlog rows in `TaskBacklog.tsx` are `draggable` (291). None of these work on Android touch.
- **Why it helps:** Without this, a phone can view the plan but not change it.
- **How to build:** Tap or long-press a block to open a bottom action sheet with the `BlockContextMenu.tsx` actions (edit, move, resize, unschedule, check in). Move and resize use time pickers or ±15 min steppers. Keep drag and right-click on desktop.
- **Done when:** Every block action is reachable on a touch device without a mouse.
- **Model:** Default model; agent mode

**Cursor prompt:**

```text
@src/components/DayGrid.tsx @src/components/BlockContextMenu.tsx @src/components/DayAgenda.tsx
Create: src/components/BottomSheet.tsx
Create a reusable BottomSheet. On touch (pointerType touch), tap/long-press on a block opens it with BlockContextMenu actions; move/resize via time inputs and ±15 min steppers. Keep mouse drag and right-click.
Checks:
1. All block actions work in Chrome device emulation with touch.
2. Desktop drag and context menu still work.
3. Buttons at least 44px.
Touch only these files. No new dependencies. Keep tests passing. Diff only.
```

#### 1.4 Floating add button and bottom-sheet editor (M)

- **What to change:** Tasks are added through the inline `task-form` in `TaskBacklog.tsx` (around line 184), and scheduling requires drag.
- **Why it helps:** Quick capture from anywhere is the most common phone action.
- **How to build:** New `TaskEditor.tsx` in a `BottomSheet` (title, area, duration, depth, due, Schedule at date/time), opened by a floating + button above the tab bar, and reused for edits from 1.3.
- **Done when:** From any phone screen a task can be added and scheduled in under 15 seconds.
- **Model:** Default model; agent mode

**Cursor prompt:**

```text
@src/components/TaskBacklog.tsx @src/components/BottomSheet.tsx @src/components/AuthShell.tsx @src/lib/tasks.ts
Create: src/components/TaskEditor.tsx
Extract the task form into TaskEditor (adds optional Schedule at date+time that creates a PlacedBlock). Show a floating + button on phone that opens it in BottomSheet; reuse it for Edit.
Checks:
1. Add and schedule a task on a 360px viewport without drag.
2. Desktop inline form still works.
3. FAB does not cover the tab bar.
Touch only these files. No new dependencies. Keep tests passing. Diff only.
```

#### 1.5 Collapsible Planner made of cards (S)

- **What to change:** `PlannerAreas.tsx` stacks area cards, `TeachingPlan`, `GoalsGantt` and `PlannerWeekBacklog` in one long column.
- **Why it helps:** The Planner page was the main pain point in the hands-on test, and on a phone it is very long.
- **How to build:** Wrap each part in an accordion card (Week, Goals, Schedules, Areas) with open state saved like `writeSchedulerLayerMode`. On phones show goals as cards with progress bars.
- **Done when:** The Planner opens with one expanded card; others expand on tap and remember their state.
- **Model:** Small, fast model; agent mode

**Cursor prompt:**

```text
@src/components/PlannerAreas.tsx @src/lib/scheduler-layers.ts @src/index.css
Wrap PlannerAreas sections (Week backlog, Goals Gantt, Teaching/Schedules, Areas) in accordion cards; persist open state in localStorage like writeSchedulerLayerMode. Only Week open by default.
Checks:
1. One card open on first load; state remembered after reload.
2. Works at 360px.
3. No behaviour change inside the cards.
Touch only these files. No new dependencies. Keep tests passing. Diff only.
```

#### 1.6 Calendar month view: tap a date to open a day sheet (M)

- **What to change:** `MonthCalendarView.tsx` day cells have no click handler, and three months side by side are cramped on a phone.
- **Why it helps:** Turns the calendar from an overview into a way to plan.
- **How to build:** One month with swipe on phones, three on desktop. `onSelectDate(dateKey)` opens a `BottomSheet` with that date's events and series hits plus Open day, Add item and Mark day type (6.3). `AuthShell.tsx` keeps an `anchorDate` for `DayGrid` and `DayAgenda`.
- **Done when:** Tapping any date opens its sheet, and Open day jumps to that date.
- **Model:** Default model; agent mode

**Cursor prompt:**

```text
@src/components/MonthCalendarView.tsx @src/components/AuthShell.tsx @src/components/BottomSheet.tsx @src/lib/calendar-series.ts
Add onSelectDate to MonthCalendarView; open a BottomSheet listing that date's events/series with Open day and Add item. Add anchorDate state in AuthShell passed to DayGrid/DayAgenda. Show one month with swipe on phone.
Checks:
1. Tap a date shows its items.
2. Open day centres the grid/agenda on that date.
3. Phone shows one month at a time.
Touch only these files. No new dependencies. Keep tests passing. Diff only.
```

#### 1.7 Readable grid scaling (S)

- **What to change:** The grid always shows five columns with minimum widths and a fixed row height.
- **Why it helps:** Labels must stay readable on small screens without pinch-zoom.
- **How to build:** Visible days follow the breakpoint (1 / 3 / 5 or 7) and the `daysVisible` setting; add a compact / comfortable row toggle; text at least 14 px with truncated titles.
- **Done when:** At 412 px the grid shows one readable day, at 768 px three, on desktop the user's setting.
- **Model:** Small, fast model; agent mode

**Cursor prompt:**

```text
@src/lib/time.ts @src/components/DayGrid.tsx @src/index.css
Make weekCenteredDayKeys take a day count; DayGrid uses 1/3/5-or-7 by breakpoint and daysVisible. Add a compact/comfortable row-height toggle. Minimum 14px text with ellipsis titles.
Checks:
1. Column count changes at 640px and 1024px.
2. time.test.ts covers 1, 3, 5 and 7 days.
3. No text under 14px in the grid.
Touch only these files. No new dependencies. Keep tests passing. Diff only.
```

#### 1.8 Calm, touch-friendly check-ins (S)

- **What to change:** An effect in `DayGrid.tsx` (around line 264) opens `CheckInPrompt` as soon as any ended block is unchecked, so it pops up on the first view.
- **Why it helps:** Check-ins should help, not interrupt; on a phone they work best as one quick sheet.
- **How to build:** Replace auto-open with a pending-count chip that opens a sheet listing `dueCheckIns` with large Done / Partly / Not done and Later (`snoozedIds`). Auto-open only for a block that ended in the last 15 minutes.
- **Done when:** Opening the app shows no dialog, the pending count is visible, and nothing is ever marked done automatically.
- **Model:** Small, fast model; agent mode

**Cursor prompt:**

```text
@src/components/DayGrid.tsx @src/components/CheckInPrompt.tsx @src/components/BottomSheet.tsx
Remove the auto-open effect; show a 'N to check in' chip opening a BottomSheet with all dueCheckIns (44px Done/Partly/Not done/Later). Auto-open only if a block ended within the last 15 minutes.
Checks:
1. No dialog on first load with old unchecked blocks.
2. All due blocks can be checked in from the sheet.
3. checkin.test.ts passes.
Touch only these files. No new dependencies. Keep tests passing. Diff only.
```

#### 1.9 Installable PWA, offline shell and the product name (M)

- **What to change:** `index.html` has a viewport tag but no manifest, icons or service worker, and its title is still Work Planner.
- **Why it helps:** A home-screen app that opens instantly and works on weak signal, under one product name.
- **How to build:** Add `vite-plugin-pwa` with a manifest (Samaya Scheduler, icons, `display: standalone`), precache the shell, and leave data to Firestore offline cache (0.3). Rename the title and header.
- **Done when:** Chrome on Android offers Install, and the installed app opens offline to the last synced day.
- **Model:** Default model; agent mode

**Cursor prompt:**

```text
@vite.config.ts @index.html @src/main.tsx @package.json
Create: public/icons/icon-192.png, public/icons/icon-512.png
Configure vite-plugin-pwa (autoUpdate, manifest name 'Samaya Scheduler', standalone, theme colour, 192/512 icons) and register it in main.tsx. Rename title in index.html.
Checks:
1. Lighthouse reports the app installable.
2. Offline reload shows the shell.
3. npm run build passes.
Touch only these files. New dependency allowed: vite-plugin-pwa. Keep tests passing. Diff only.
```

#### 1.10 Reminders model and in-app notifications (M)

- **What to change:** Events, series and blocks have no reminder field, and reminders (US-G1) are not built.
- **Why it helps:** A reminder before an event and a nudge when a block ends make a phone planner useful.
- **How to build:** Add `reminderMin` to events, series and blocks, defaulting to `reminderDefaultMin`. Ask permission in setup; while the app or PWA is open, schedule Notification API alerts. Push to a closed phone needs FCM and scheduled Cloud Functions on Blaze, so it stays optional.
- **Done when:** With the app open, a notification fires at each item's reminder time and when a block ends.
- **Model:** Default model; agent mode

**Cursor prompt:**

```text
@src/lib/config.ts @src/lib/calendar-events.ts @src/lib/calendar-series.ts @src/lib/blocks.ts
Create: src/lib/reminders.ts, src/lib/reminders.test.ts, src/hooks/useReminders.ts
Add reminderMin (fallback settings.reminderDefaultMin) to events, series and blocks. Create reminders.ts (pure: next due reminders for a time window) and useReminders (Notification API while open, permission request).
Checks:
1. reminders.test.ts covers defaults, overrides and series.
2. Notification fires in the browser at the set time.
3. No-permission path degrades silently.
Touch only these files. No new dependencies. Keep tests passing. Diff only.
```

#### 1.11 Tests at phone widths (M)

- **What to change:** The phone layout has never been tested.
- **Why it helps:** Catches overflow and tiny targets before users do.
- **How to build:** Playwright projects at 360 × 780 and 412 × 915 (common Android widths) plus desktop. Run Try demo, today's agenda, add via the + button, check in and a calendar day sheet; assert no horizontal scroll and 44 px targets. Check once on a real phone.
- **Done when:** CI runs the mobile suite on every PR, and it passes at 360 and 412 px.
- **Model:** Default model; agent mode

**Cursor prompt:**

```text
@package.json @../.github/workflows/work-planner-ci.yml
Create: playwright.config.ts, tests/e2e/mobile.spec.ts
Add Playwright with projects phone-360 (360×780), phone-412 (412×915) and desktop against the emulator dev server. mobile.spec: demo sign-in, agenda, FAB add, check-in, calendar day sheet; assert scrollWidth ≤ innerWidth and buttons ≥44px. Add a CI step.
Checks:
1. npx playwright test passes locally.
2. CI job runs the suite.
3. Fails if any page scrolls horizontally.
Touch only these files. New dependency allowed: @playwright/test. Keep tests passing. Diff only.
```

### Phase 2: Setup flow and templates

This makes the app generic. A new user answers a few questions or picks a template, and every feature reads from that configuration.

#### 2.1 Setup wizard, part 1: shell, template, areas, bands, slots (M)

- **What to change:** A new account lands on an app that assumes the demo's areas and bands.
- **Why it helps:** Each user's areas, energy and commute are different; setup captures them in minutes.
- **How to build:** New `SetupWizard.tsx`, shown while `users/{uid}.setupDone` is unset: pick a template (2.3), then life areas, energy bands and commute or low-focus slots. Phone-friendly cards with Skip, writing the 0.4 config.
- **Done when:** A new user finishes part 1 on a phone and sees their areas and bands in the app.
- **Model:** Default model; agent mode

**Cursor prompt:**

```text
@src/lib/config.ts @src/components/AuthShell.tsx @src/components/PlannerAreas.tsx
Create: src/components/SetupWizard.tsx
Create SetupWizard (step cards with Back/Skip/Next) shown when settings.setupDone is false: template pick, areas (reuse PlannerAreas area form), bands, slot rules. Save each step to config.
Checks:
1. New account sees the wizard; existing account does not.
2. Each step saves and can be skipped.
3. Usable at 360px.
Touch only these files. No new dependencies. Keep tests passing. Diff only.
```

#### 2.2 Setup wizard, part 2: minimums, schedule, recurring, cadence, reminders (M)

- **What to change:** Part 1 covers only areas, bands and slots.
- **Why it helps:** Finishes setup so the agenda is filled on day one.
- **How to build:** Add steps for daily minimum blocks, a work or class schedule (periods and slots), recurring items, check-in cadence, reminders and notification permission, and timezone; set `setupDone` at the end.
- **Done when:** Sign-up to a filled agenda on a phone in under 5 minutes; every answer editable later in Settings.
- **Model:** Default model; agent mode

**Cursor prompt:**

```text
@src/components/SetupWizard.tsx @src/lib/config.ts @src/hooks/useReminders.ts
Add wizard steps: daily minimums, schedule (periods + weekly slots), recurring items, checkInCadence, reminderDefaultMin + notification permission, timezone. Set setupDone on finish.
Checks:
1. Completing the wizard fills the agenda.
2. setupDone set only at the end.
3. All steps work at 360px.
Touch only these files. No new dependencies. Keep tests passing. Diff only.
```

#### 2.3 Templates (M)

- **What to change:** There is only one fictional seed (`src/data/fictional-seed.ts`).
- **Why it helps:** A sensible start in one tap, and a demo that shows off the generic design.
- **How to build:** Add `src/data/templates/` with Teacher / PhD, Student, Office worker and Blank as typed, fictional configs. Try demo offers the template picker; the existing seed becomes the Teacher / PhD template.
- **Done when:** Picking any template fills the config with a believable fictional week; a test checks templates for personal markers (9.5).
- **Model:** Default model; agent mode

**Cursor prompt:**

```text
@src/data/fictional-seed.ts @src/lib/seed.ts @src/lib/config.ts
Create: src/data/templates/index.ts, src/data/templates/teacher-phd.ts, src/data/templates/student.ts, src/data/templates/office.ts, src/data/templates/templates.test.ts
Create four typed fictional templates (teacher-phd from the existing seed, student, office, blank) and applyTemplate(uid, id) writing config. Demo seeding uses applyTemplate.
Checks:
1. Each template applies cleanly in the emulator (test).
2. Demo still loads fictional data.
3. No real names or places in templates.
Touch only these files. No new dependencies. Keep tests passing. Diff only.
```

#### 2.4 Settings screen (M)

- **What to change:** Areas and daily minimums can be edited in `PlannerAreas.tsx`, but bands, slots, schedules, cadence and reminders have no screen.
- **Why it helps:** Terms, commutes and goals change, and settings must change with them.
- **How to build:** New `Settings.tsx` under More with the wizard's sections as lists plus add / edit bottom sheets, reusing the wizard step components.
- **Done when:** Every wizard setting can be edited later from a phone.
- **Model:** Default model; agent mode

**Cursor prompt:**

```text
@src/components/SetupWizard.tsx @src/components/AuthShell.tsx @src/lib/config.ts
Create: src/components/Settings.tsx
Create Settings (under More) reusing SetupWizard step components as editable sections with BottomSheet editors.
Checks:
1. Each setting can be changed and persists.
2. Changes reflect in the grid without reload.
3. Usable at 360px.
Touch only these files. No new dependencies. Keep tests passing. Diff only.
```

#### 2.5 Export and import (config and data), printable week (M)

- **What to change:** Setup can only be moved by hand in the Firebase console, and NFR-6 (export, import, week image) is not built.
- **Why it helps:** Users back up and move their setup and data, and share a template without personal data.
- **How to build:** Export config only, or config plus data, to one JSON file and import with a preview. A user's own config is imported privately into their account and never committed. Add a print stylesheet for the week.
- **Done when:** Export, wipe the emulator, import, and the plan is identical.
- **Model:** Default model; agent mode

**Cursor prompt:**

```text
@src/lib/config.ts @src/lib/planner-store.ts @src/components/Settings.tsx @src/index.css
Create: src/lib/export-import.ts, src/lib/export-import.test.ts
Create export-import.ts: exportJson(uid, {includeData}) and importJson(uid, json, {dryRun}) with a preview count per collection. Add Export/Import buttons in Settings and an @media print style for the week grid.
Checks:
1. Round-trip test leaves data identical.
2. Dry run writes nothing.
3. Print preview shows the week legibly.
Touch only these files. No new dependencies. Keep tests passing. Diff only.
```

### Phase 3: Remaining quick UX fixes

Small, independent fixes from the hands-on test that Phase 1 did not cover.

#### 3.1 Discoverable clash resolution (S)

- **What to change:** The `overlap-banner` in `DayGrid.tsx` appears only at the moment of a drop; afterwards a clash is only an outline and tooltip, and `BlockContextMenu.tsx` has no resolve action.
- **Why it helps:** Schedules change often, and every clash needs an obvious fix.
- **How to build:** Show a ⚠ badge on clashing blocks (the `clashing` flag exists). Tapping it, or Resolve clash in the 1.3 action sheet, reopens the `resolveOverlap` options.
- **Done when:** Every clash shows a badge and can be resolved in two taps.
- **Model:** Small, fast model; agent mode

**Cursor prompt:**

```text
@src/components/DayGrid.tsx @src/components/BlockContextMenu.tsx
Render a ⚠ badge on blocks where clashing is true; tapping it or a new 'Resolve clash' menu item reopens the overlap options for that block.
Checks:
1. Badge shows on every clashing block.
2. Resolve works from badge and menu.
3. Existing overlap tests pass.
Touch only these files. No new dependencies. Keep tests passing. Diff only.
```

#### 3.2 Activity log filters (S)

- **What to change:** `ActivityLog.tsx` lists every entry; rules keep `activityLog` append-only.
- **Why it helps:** Keep the audit trail but show real changes, especially ones made by a connected assistant.
- **How to build:** Client-side filters for actor role, entity type and date range, plus a Hide net-zero toggle that hides add-then-delete pairs on the same `entityId`.
- **Done when:** Test noise disappears with one toggle, and Assistant only shows exactly what an assistant changed.
- **Model:** Small, fast model; agent mode

**Cursor prompt:**

```text
@src/components/ActivityLog.tsx @src/lib/activity-log.ts @src/lib/activity-log.test.ts
Add a pure filterActivity(entries, {role, entityType, from, to, hideNetZero}) in activity-log.ts and filter controls in ActivityLog. No writes change.
Checks:
1. Net-zero pairs hidden (unit test).
2. Role and date filters work.
3. Rules unchanged.
Touch only these files. No new dependencies. Keep tests passing. Diff only.
```

#### 3.3 Timezone from settings (S)

- **What to change:** Times assume `DEFAULT_TZ` in `lib/time.ts`.
- **Why it helps:** Users in any timezone see correct times.
- **How to build:** Read `timezone` from settings wherever `DEFAULT_TZ` is used, and show Last updated in that timezone with `formatLastUpdated`.
- **Done when:** Changing the timezone setting shifts every displayed time correctly.
- **Model:** Small, fast model; agent mode

**Cursor prompt:**

```text
@src/lib/time.ts @src/components/AuthShell.tsx @src/components/LiveClock.tsx
Thread settings.timezone from AuthShell to all components and lib calls that default to DEFAULT_TZ; show 'Last updated' via formatLastUpdated next to LiveClock.
Checks:
1. time.test.ts covers two timezones.
2. UI times change with the setting.
3. Demo unaffected.
Touch only these files. No new dependencies. Keep tests passing. Diff only.
```

### Phase 4: Core planning engine

Generic rules that match each task to the right time, driven by the user's configuration.

#### 4.1 Energy bands from settings (S)

- **What to change:** `SeedBand` has `level`, `start`, `end` and `weekdays`, but the grid uses demo bands.
- **Why it helps:** Matching task depth to energy is the core idea of the app.
- **How to build:** Feed `users/{uid}/bands` into the band strip and `slotBandLevel`; any number of bands per level and weekday, Low for unbanded time.
- **Done when:** Editing a band updates the strip immediately; different users see different strips.
- **Model:** Small, fast model; agent mode

**Cursor prompt:**

```text
@src/lib/day-grid.ts @src/components/DayGrid.tsx @src/lib/config.ts
Use config bands for the band strip and slotBandLevel; unbanded time is Low. Support per-weekday bands.
Checks:
1. Strip matches config.
2. day-grid tests cover weekday-specific bands.
3. Demo bands unchanged.
Touch only these files. No new dependencies. Keep tests passing. Diff only.
```

#### 4.2 Task depth and slot rules (commute or low-focus slots) (M)

- **What to change:** Tasks and `PlacedBlock` carry only `deepWork?: boolean`; `findDeepWorkInLowBand` warns only for deep work in Low; commute is detected by the label regex `/commute/i`.
- **Why it helps:** Commutes and other low-focus slots suit listening or review, and the user decides which slots those are.
- **How to build:** Add `depth: "deep" | "shallow" | "listen"` (mapping `deepWork` to deep) and `slotRules` (name, time, weekdays, day types, allowed depths). Replace the check with `findDepthMismatches` and show a depth icon.
- **Done when:** A deep task in a listen-only slot warns; a listen task there does not, for any user's rules.
- **Model:** Default model; agent mode

**Cursor prompt:**

```text
@src/lib/day-grid.ts @src/lib/tasks.ts @src/lib/blocks.ts @src/components/TaskBacklog.tsx @src/lib/day-grid.test.ts
Add depth to tasks/blocks (migrate deepWork→deep) and slotRules from config. Replace findDeepWorkInLowBand with findDepthMismatches (deep in Low or in a slot that disallows it). Drop the /commute/i regex.
Checks:
1. Tests: deep in listen-only slot warns, listen does not.
2. Old deepWork data still warns correctly.
3. Depth icon shows in backlog and grid.
Touch only these files. No new dependencies. Keep tests passing. Diff only.
```

#### 4.3 Daily minimum blocks (soft or required) (M)

- **What to change:** `DailyRule` (`areaId`, `minMinutesPerDay`) in `lib/rules.ts` is a soft metric for the weekly review; US-C3 says no warnings while scheduling.
- **Why it helps:** Many people have a non-negotiable daily block (deep focus, exercise, study) with no fixed time.
- **How to build:** Add `kind: "soft" | "required"`, optional `outsideWindow` (time inside it does not count) and `days`. Required rules show a progress badge (for example 0 / 90 min) in the day header and agenda. Update US-C3 so required rules may warn.
- **Done when:** Required rules show daily progress and a badge when short; soft rules appear only in the weekly review.
- **Model:** Default model; agent mode

**Cursor prompt:**

```text
@src/lib/rules.ts @src/lib/rules.test.ts @src/components/DayGrid.tsx @src/components/DayAgenda.tsx @_docs/FUNCTIONAL_SPEC_grok_bot.md
Extend DailyRule with kind, outsideWindow and days; evaluateDayRules excludes minutes inside outsideWindow. Show a progress badge for required rules in DayGrid headers and DayAgenda. Update US-C3.
Checks:
1. Tests cover outsideWindow and days.
2. Badge shows only for required rules.
3. Weekly minimum evaluation unchanged for soft rules.
Touch only these files. No new dependencies. Keep tests passing. Diff only.
```

#### 4.4 Free-slot finder (M)

- **What to change:** No function lists free time.
- **Why it helps:** Suggestions, replanning and Move to next free slot all need it.
- **How to build:** Pure `lib/free-slots.ts`: grid window minus schedule items, routines, blocks and slot rules, returning gaps of at least N minutes tagged with band and allowed depths.
- **Done when:** Tests cover a workday, a weekend, a holiday and a version switch, matching hand calculation.
- **Model:** Default model; agent mode

**Cursor prompt:**

```text
@src/lib/day-grid.ts @src/lib/blocks.ts
Create: src/lib/free-slots.ts, src/lib/free-slots.test.ts
Create pure freeSlots(dateKey, model, {minMinutes}) returning [{start,end,band,allowedDepths}] by subtracting all occupied items and slot rules from the grid window.
Checks:
1. Tests: workday, weekend, holiday, timetable switch.
2. No UI changes.
3. Runs in under 5ms for a day (test).
Touch only these files. No new dependencies. Keep tests passing. Diff only.
```

#### 4.5 Suggestion engine (M)

- **What to change:** Blocks are placed only by drag. The spec says the app may suggest, never auto-place.
- **Why it helps:** Turns the daily where does it fit decision into one tap.
- **How to build:** Pure `lib/suggest.ts` scoring free slots by band match, depth rules, `outsideWindow` and preferred times, returning the best slot per missing required block.
- **Done when:** Tests show sensible choices for a workday, a weekend and a full day (no suggestion).
- **Model:** Default model; agent mode

**Cursor prompt:**

```text
@src/lib/free-slots.ts @src/lib/rules.ts
Create: src/lib/suggest.ts, src/lib/suggest.test.ts
Create pure suggestFor(dateKey, model, rules) returning one best slot per unmet required rule, scored by band match, depth, outsideWindow and preferred time.
Checks:
1. Tests: workday, weekend, no-room day.
2. Never suggests inside outsideWindow.
3. No UI changes.
Touch only these files. No new dependencies. Keep tests passing. Diff only.
```

#### 4.6 One-tap suggestion chips (S)

- **What to change:** 4.5 computes suggestions but nothing shows them.
- **Why it helps:** Accepting a good slot should take one tap.
- **How to build:** Show one chip per missing required block (Place Deep focus 8:00–9:30 PM?) with Accept and Other slot; Accept creates a `PlacedBlock` through `onPlacedBlocksChange`.
- **Done when:** Each short day shows one suggestion, and nothing is placed without a tap.
- **Model:** Small, fast model; agent mode

**Cursor prompt:**

```text
@src/components/DayAgenda.tsx @src/components/DayGrid.tsx @src/lib/suggest.ts
Render suggestFor results as chips in DayAgenda and DayGrid headers with Accept (creates PlacedBlock via onPlacedBlocksChange) and Other slot (next candidate).
Checks:
1. Accept places the block.
2. Other slot cycles candidates.
3. Nothing placed automatically.
Touch only these files. No new dependencies. Keep tests passing. Diff only.
```

#### 4.7 Clash resolution engine (M)

- **What to change:** `resolveOverlap` offers only Shorten this, Shorten other and Cancel, for `overlap.conflicts[0]` only.
- **Why it helps:** Moving is often better than shortening.
- **How to build:** Add Move to next free slot (same band or better) and Keep both; handle all conflicts; for one-off schedule changes ask replace or extra (US-B5 AC2).
- **Done when:** A clash can be resolved by moving, shortening or keeping both, with no overlaps left unless Keep both is chosen.
- **Model:** Default model; agent mode

**Cursor prompt:**

```text
@src/components/DayGrid.tsx @src/lib/free-slots.ts @src/lib/blocks.ts
Extend resolveOverlap with 'Move to next free slot' (freeSlots, same band or better) and 'Keep both'; loop over all conflicts, not only conflicts[0].
Checks:
1. Move leaves no overlap.
2. Keep both keeps both blocks.
3. Multiple conflicts handled.
Touch only these files. No new dependencies. Keep tests passing. Diff only.
```

### Phase 5: Daily loop

Plan in the morning, check in during the day, replan, and review in the evening, at a cadence each user sets.

#### 5.1 Today plan header (M)

- **What to change:** There is no single today summary.
- **Why it helps:** Opening the app should answer what now, what next and what is missing.
- **How to build:** Header on `DayAgenda` with required-block progress and suggestions, ★ week goals and deadlines in the next 7 days from `lib/calendar-events.ts`; collapses on scroll.
- **Done when:** At the start of the day the header shows progress, suggestions, goals and deadlines on one phone screen.
- **Model:** Default model; agent mode

**Cursor prompt:**

```text
@src/components/DayAgenda.tsx @src/lib/calendar-events.ts @src/lib/goals.ts
Create: src/components/TodayHeader.tsx
Create TodayHeader (required-rule progress + chips, starred week goals, next-7-day deadlines) at the top of DayAgenda; collapse to one line on scroll.
Checks:
1. Shows all four parts with seed data.
2. Collapses on scroll.
3. Fits a 360px screen.
Touch only these files. No new dependencies. Keep tests passing. Diff only.
```

#### 5.2 Configurable check-in cadence, with notes (M)

- **What to change:** Check-ins fire after every block (`isBlockEnded` in `lib/checkin.ts`).
- **Why it helps:** Some people want a prompt after every block, others set times or one end-of-day review.
- **How to build:** `checkInCadence`: after each block, at set times, or end of day only. Optional note in `CheckInPrompt.tsx` saved to `users/{uid}/logs`. Never auto-done.
- **Done when:** Each cadence prompts as configured, check-ins sync across devices, and notes appear in logs.
- **Model:** Default model; agent mode

**Cursor prompt:**

```text
@src/lib/checkin.ts @src/lib/checkin.test.ts @src/components/CheckInPrompt.tsx @src/components/DayGrid.tsx
Add dueByCadence(items, cadence, now) to checkin.ts and use it for the pending list. Add an optional note field saved as a logs doc {date, blockId, areaId, note}.
Checks:
1. Tests for all three cadences.
2. Notes saved to logs.
3. Nothing auto-marked done.
Touch only these files. No new dependencies. Keep tests passing. Diff only.
```

#### 5.3 Replan into a real slot (M)

- **What to change:** `replanUnfinishedTask` only returns partly done or not done work to the backlog with `replan: true`.
- **Why it helps:** Unfinished work should land in the next good slot, not sit in a list.
- **How to build:** After Partly or Not done, offer Next free slot today, Tomorrow or Backlog via `free-slots`, keeping remaining minutes.
- **Done when:** A task partly done with 40 minutes left is offered a 40-minute slot that fits its depth.
- **Model:** Default model; agent mode

**Cursor prompt:**

```text
@src/lib/checkin.ts @src/lib/free-slots.ts @src/components/CheckInPrompt.tsx
After partly/not-done, show Next slot today / Tomorrow / Backlog. Today/Tomorrow place a block of the remaining minutes via freeSlots respecting depth.
Checks:
1. Offered slot fits remaining minutes and depth.
2. Backlog path unchanged.
3. checkin tests pass.
Touch only these files. No new dependencies. Keep tests passing. Diff only.
```

#### 5.4 End-of-day review and energy tags (M)

- **What to change:** US-D3 is not built.
- **Why it helps:** Energy tags refine each user's bands over time.
- **How to build:** At `eveningReviewAt` or on demand, a sheet with planned vs done per area, unchecked blocks and an energy tag per band, saved to `users/{uid}/energyTags/{date}`.
- **Done when:** After 14 days of tags, analytics (8.3) shows completion by band.
- **Model:** Default model; agent mode

**Cursor prompt:**

```text
@src/lib/rules.ts @src/lib/checkin.ts @src/components/BottomSheet.tsx
Create: src/components/EveningReview.tsx
Create EveningReview sheet (planned vs done per area, unchecked blocks, High/Medium/Low tag per band) opened at settings.eveningReviewAt or from More; save energyTags/{date}.
Checks:
1. Totals match check-ins.
2. Tag saved per date.
3. Opens at the set time.
Touch only these files. No new dependencies. Keep tests passing. Diff only.
```

#### 5.5 ★ week goals (S)

- **What to change:** `components/WeeklyGoals.tsx` (starred goals, carry-over) is built but not imported anywhere.
- **Why it helps:** Week goals connect daily blocks to what matters this week.
- **How to build:** Render it in the Planner Week card, show ★ goals in the Today header, store in `users/{uid}/goals` by ISO week.
- **Done when:** A user can add, star and carry over a week goal, and it shows on Today.
- **Model:** Small, fast model; agent mode

**Cursor prompt:**

```text
@src/components/WeeklyGoals.tsx @src/components/PlannerAreas.tsx @src/lib/goals.ts
Mount WeeklyGoals in the Planner Week card and persist goals via planner-store by ISO week.
Checks:
1. Add, star and carry over work.
2. Goals persist across devices.
3. Shown in TodayHeader.
Touch only these files. No new dependencies. Keep tests passing. Diff only.
```

#### 5.6 Periodic progress report helper (M)

- **What to change:** FR-32/33 (notes and generated status update) are not built.
- **Why it helps:** Many people report progress every N weeks to a supervisor, manager or client.
- **How to build:** Attach a report series (every N weeks) to any area; Generate report collects that area's `logs` since the last report into a copyable draft.
- **Done when:** On a report date, one tap gives a dated list of work since the last report.
- **Model:** Default model; agent mode

**Cursor prompt:**

```text
@src/lib/calendar-series.ts @src/lib/config.ts
Create: src/lib/report.ts, src/lib/report.test.ts, src/components/ReportDraft.tsx
Create report.ts building a dated Markdown list of an area's logs since the last report date, and ReportDraft with a Copy button, opened from the area card.
Checks:
1. Test: only logs since last report included.
2. Copy puts Markdown on the clipboard.
3. Works for any area.
Touch only these files. No new dependencies. Keep tests passing. Diff only.
```

### Phase 6: Calendar, schedules, holidays and recurring items

Timetables, holidays and recurring items become data any user can edit.

#### 6.1 Timetables for any area, versioned by date (M)

- **What to change:** `lib/teaching-plan.ts` has `TimetableVersion` (`effectiveFrom`, `effectiveTo`, `slots`) and `activeTimetable()`, but only for the Job area, and the grid ignores it.
- **Why it helps:** Shifts, class timetables and office hours change by term or rota; the grid should switch on the right date.
- **How to build:** Move timetables to `users/{uid}/schedules/{id}` (name, area, optional `periods[]` such as P1 09:00–09:50, `versions[]`). `buildDayGrid` expands the active version per date and merges back-to-back slots with the same label (for example a 3-period lab). Topic coverage stays an optional teacher add-on.
- **Done when:** A schedule with two versions shows old slots before the switch date and new ones from it, for any area.
- **Model:** Default model; agent mode

**Cursor prompt:**

```text
@src/lib/teaching-plan.ts @src/lib/day-grid.ts @src/lib/config.ts @src/lib/teaching-plan.test.ts
Create: src/lib/schedules.ts, src/lib/schedules.test.ts
Create schedules.ts (Schedule {id,name,areaId,periods?,versions[]}, expandSchedulesForDate merging adjacent same-label slots). Reuse activeTimetable logic; buildDayGrid uses it. TeachingPlan reads from schedules.
Checks:
1. Tests: version switch date, merged lab block.
2. Works for a non-teaching area.
3. Teaching plan coverage still works.
Touch only these files. No new dependencies. Keep tests passing. Diff only.
```

#### 6.2 Any number of rotating timetables (M)

- **What to change:** Only one weekly pattern per version exists.
- **Why it helps:** Many schedules rotate: A/B weeks, N-day cycles or shift rotas.
- **How to build:** `rotation` on a version: weekly, `{ cycleWeeks, anchorDate }` or `{ cycleDays, anchorDate, skipDayTypes }`; slots carry `cycleIndex`; several schedules can be active at once.
- **Done when:** An A/B schedule alternates correctly, and a 6-day cycle skips holidays when told to.
- **Model:** Default model; agent mode

**Cursor prompt:**

```text
@src/lib/schedules.ts @src/lib/schedules.test.ts
Add rotation (weekly | cycleWeeks | cycleDays with anchorDate, skipDayTypes) and slot.cycleIndex to schedules; expandSchedulesForDate resolves the cycle index per date.
Checks:
1. Tests: A/B weeks, 6-day cycle with holiday skip.
2. Multiple schedules on one day.
3. Weekly behaviour unchanged.
Touch only these files. No new dependencies. Keep tests passing. Diff only.
```

#### 6.3 Holidays and day types (M)

- **What to change:** Day types (`holiday`, `no-fixed-schedule`, `online`, `exam`) exist with `hidesFixedSchedule` and `hidesCommute`, but have no UI.
- **Why it helps:** Holidays, leave, online and exam days must update the plan without code edits.
- **How to build:** Set `users/{uid}/dayTypes/{YYYY-MM-DD}` from the calendar day sheet or agenda header. Add `leave` and user-defined types with flags, date ranges and optional ICS holiday import.
- **Done when:** Marking a date or range as Holiday removes the schedule and commute slots, and the header shows the label.
- **Model:** Default model; agent mode

**Cursor prompt:**

```text
@src/lib/schedule.ts @src/components/MonthCalendarView.tsx @src/components/DayAgenda.tsx @src/lib/config.ts
Create: src/components/DayTypeSheet.tsx
Create DayTypeSheet to set a day type for a date or range (built-in + custom types with hideSchedule/hideSlots flags), opened from the calendar day sheet and agenda header.
Checks:
1. Holiday hides schedule and slots.
2. Range applies to every date.
3. Custom type flags respected.
Touch only these files. No new dependencies. Keep tests passing. Diff only.
```

#### 6.4 One-off changes: substitute, extra, cancel (M)

- **What to change:** `applyScheduleChanges` exists in `lib/schedule.ts`, but no component uses it.
- **Why it helps:** A one-time swap or extra session should take seconds.
- **How to build:** Date-keyed `users/{uid}/scheduleChanges` with a bottom-sheet form (kind, schedule, period or time, label); on overlap ask replace or extra.
- **Done when:** A substitute session shows only on its date, and a cancel hides only that slot.
- **Model:** Default model; agent mode

**Cursor prompt:**

```text
@src/lib/schedule.ts @src/lib/day-grid.ts @src/components/BottomSheet.tsx
Create: src/components/ScheduleChangeSheet.tsx
Create ScheduleChangeSheet (substitute/extra/cancel) writing scheduleChanges; buildDayGrid applies applyScheduleChanges; ask replace vs extra on overlap.
Checks:
1. Change applies to its date only.
2. Cancel hides one slot.
3. Replace/extra prompt on overlap.
Touch only these files. No new dependencies. Keep tests passing. Diff only.
```

#### 6.5 Terms and milestones (S)

- **What to change:** There are no term dates.
- **Why it helps:** Schedules should stop at term end, and exam periods should look different.
- **How to build:** Milestone events (term end, exam start) linked to a version's `effectiveTo`, with an option to apply an Exam day type across a range.
- **Done when:** After a term's last day the schedule disappears, and the exam period shows as Exam days.
- **Model:** Small, fast model; agent mode

**Cursor prompt:**

```text
@src/lib/schedules.ts @src/lib/calendar-events.ts @src/components/DayTypeSheet.tsx
Add termEnd and examStart milestones to a schedule version; setting them updates effectiveTo and can bulk-apply the Exam day type.
Checks:
1. Schedule stops after term end.
2. Exam range applied.
3. Milestones on the calendar.
Touch only these files. No new dependencies. Keep tests passing. Diff only.
```

#### 6.6 Recurring personal items on the grid (M)

- **What to change:** `SeriesRule` supports only every N weeks or every N months on a day, and series show only on the calendar.
- **Why it helps:** Errands, servicing and routines should appear on the day by themselves.
- **How to build:** Add `{ freq: "weekly", byWeekday }`, `durationMin` and `areaId` beside `time`; timed series project onto the grid and agenda; pause hides them.
- **Done when:** A weekly item on two weekdays shows on both, an every-4-months item lands on the right dates, and pause hides both.
- **Model:** Default model; agent mode

**Cursor prompt:**

```text
@src/lib/calendar-series.ts @src/lib/calendar-series.test.ts @src/lib/day-grid.ts
Add weekly byWeekday rule, durationMin and areaId to CalendarSeries; buildDayGrid adds timed series occurrences as routine items.
Checks:
1. Tests: weekly two days, every 4 months.
2. Paused series hidden.
3. Calendar markers unchanged.
Touch only these files. No new dependencies. Keep tests passing. Diff only.
```

### Phase 7: Integrations

Let assistants and other tools read and write the plan safely.

#### 7.1 Scoped assistant access in security rules (M)

- **What to change:** `firestore.rules` lets an allowlisted bot (`users/{ownerUid}/bots/{botUid}`) use only `teachingPlans` and `activityLog`.
- **Why it helps:** Any user can let an AI assistant read and update their plan, limited to what they allow and fully audited.
- **How to build:** Store `scopes` (collection → read / write) on `bots/{botUid}` and check them per collection in `canAccessWorkspace`. Every bot write appends to `activityLog` with `actorRole: bot`. Assistants use the Firestore REST API, which works on Spark.
- **Done when:** An assistant with events write scope can add an event; it cannot touch collections outside its scopes.
- **Model:** Default model; agent mode

**Cursor prompt:**

```text
@firestore.rules @src/lib/workspace.ts
Create: tests/integration/rules-bot.emulator.test.ts
Add per-collection scopes on users/{owner}/bots/{bot} and enforce them in firestore.rules for all planner collections. Add emulator tests for allowed and denied reads/writes.
Checks:
1. Allowed scope succeeds, missing scope denied (tests).
2. Owner access unchanged.
3. activityLog still append-only.
Touch only these files. New dependency allowed: @firebase/rules-unit-testing. Keep tests passing. Diff only.
```

#### 7.2 Connected assistants screen (S)

- **What to change:** Bot setup is manual in the Firebase console (README).
- **Why it helps:** Users connect and revoke assistants without the console.
- **How to build:** Settings → Connected assistants: add by uid, tick scopes, revoke.
- **Done when:** A user can add, scope and revoke an assistant from the app.
- **Model:** Small, fast model; agent mode

**Cursor prompt:**

```text
@src/components/Settings.tsx @src/lib/workspace.ts
Add a Connected assistants section to Settings: add by uid, scope checkboxes per collection, revoke (deletes bots/{botUid}).
Checks:
1. Scopes saved as in 7.1.
2. Revoke removes access.
3. Usable at 360px.
Touch only these files. No new dependencies. Keep tests passing. Diff only.
```

#### 7.3 Calendar export (ICS) (S)

- **What to change:** There is no export.
- **Why it helps:** Plans show in Google Calendar or any calendar app.
- **How to build:** Client-side `.ics` of events, series and schedules for the next 3 months in the user's timezone. Two-way sync needs OAuth and a backend, so later.
- **Done when:** Importing the file into Google Calendar shows the next 3 months correctly.
- **Model:** Small, fast model; agent mode

**Cursor prompt:**

```text
@src/lib/calendar-series.ts @src/lib/schedules.ts @src/components/Settings.tsx
Create: src/lib/ics.ts, src/lib/ics.test.ts
Create ics.ts generating RFC 5545 VEVENTs (TZID from settings) for 3 months of events, series and schedules; add Download .ics in Settings.
Checks:
1. Output validates (test against a fixture).
2. Times correct in the user's timezone.
3. No new dependencies.
Touch only these files. No new dependencies. Keep tests passing. Diff only.
```

#### 7.4 Markdown and Logseq journal sync (M)

- **What to change:** There is no notes-app link.
- **Why it helps:** Keeps learning notes and the plan in step.
- **How to build:** Export day plans as Markdown journal pages with a Logseq preset (`journals/YYYY_MM_DD.md`, lines like `- 20:00–21:30 [[Area]] Task #done`). Import a learning calendar by parsing `SCHEDULED:` and `DEADLINE:` lines into events.
- **Done when:** Export a week, open it in Logseq, and import a learning page back as events.
- **Model:** Default model; agent mode

**Cursor prompt:**

```text
@src/lib/calendar-events.ts @src/components/Settings.tsx
Create: src/lib/markdown-journal.ts, src/lib/markdown-journal.test.ts
Create markdown-journal.ts: exportDays(range) → files per day (Logseq naming preset), parseLogseq(text) → events from SCHEDULED/DEADLINE. Add Export and Import in Settings.
Checks:
1. Round-trip test.
2. Handles SCHEDULED and DEADLINE.
3. No new dependencies.
Touch only these files. No new dependencies. Keep tests passing. Diff only.
```

### Phase 8: Analytics

This needs a few weeks of check-ins first.

#### 8.1 Weekly review (M)

- **What to change:** `evaluateWeekMinimums` in `lib/rules.ts` computes allocation, but nothing shows it.
- **Why it helps:** Shows whether required blocks happened and how time split across areas.
- **How to build:** Phone-friendly `WeeklyReview.tsx` cards: planned vs done minutes per area, required-rule days hit, a streak and ★ goals hit.
- **Done when:** At week's end the review shows minutes per area and required days hit.
- **Model:** Default model; agent mode

**Cursor prompt:**

```text
@src/lib/rules.ts @src/lib/checkin.ts @src/lib/goals.ts
Create: src/components/WeeklyReview.tsx
Create WeeklyReview cards from evaluateWeekMinimums plus check-ins: minutes per area, required days hit, streak, starred goals done.
Checks:
1. Numbers match seed data by hand.
2. Usable at 360px.
3. No new dependencies.
Touch only these files. No new dependencies. Keep tests passing. Diff only.
```

#### 8.2 Goal progress roll-up (M)

- **What to change:** `GoalsGantt.tsx` shows goals, but progress does not roll up (FR-37).
- **Why it helps:** Shows whether long-term goals are moving.
- **How to build:** Link tasks to week goals and week goals to area goals with `parentId`; compute progress from done check-ins.
- **Done when:** Finishing linked tasks moves the parent goal's progress.
- **Model:** Default model; agent mode

**Cursor prompt:**

```text
@src/lib/area-goals.ts @src/lib/goals.ts @src/lib/tasks.ts @src/components/GoalsGantt.tsx
Add parentId links (task→week goal→area goal) and rollupProgress(); GoalsGantt shows the rolled-up percent.
Checks:
1. Unit test for roll-up.
2. Gantt bar updates.
3. Existing goals unaffected.
Touch only these files. No new dependencies. Keep tests passing. Diff only.
```

#### 8.3 Energy vs completion (M)

- **What to change:** Not built.
- **Why it helps:** Shows whether a band really suits deep work, so users can tune bands.
- **How to build:** Completion rate and average energy tag per band and weekday, with suggested band edits.
- **Done when:** After 3 weeks the page suggests at least one band change with evidence.
- **Model:** Default model; agent mode

**Cursor prompt:**

```text
@src/lib/config.ts @src/lib/checkin.ts
Create: src/lib/energy-stats.ts, src/lib/energy-stats.test.ts, src/components/EnergyInsights.tsx
Create energy-stats.ts (completion and mean energy per band × weekday, suggestion when a band underperforms) and EnergyInsights cards.
Checks:
1. Unit tests with synthetic data.
2. Suggestion includes the evidence.
3. Usable at 360px.
Touch only these files. No new dependencies. Keep tests passing. Diff only.
```

### Phase 9: Quality

Run alongside the other phases. Engine steps already include their own unit tests.

#### 9.1 Owner and demo security rules tests (M)

- **What to change:** Nothing tests `firestore.rules` for owners and demo users (7.1 covers bots).
- **Why it helps:** Moving all data into Firestore (0.1–0.2) is only safe with tests.
- **How to build:** `@firebase/rules-unit-testing` tests: owner can read and write, another user cannot, anonymous users stay in `demo/{uid}`, `activityLog` cannot be updated or deleted.
- **Done when:** `npm test` in `work-planner-ci.yml` runs the rules tests on the emulator and they pass.
- **Model:** Default model; agent mode

**Cursor prompt:**

```text
@firestore.rules @scripts/run-integration.mjs
Create: tests/integration/rules-owner.emulator.test.ts
Add emulator rules tests for owner, other user, anonymous demo isolation and activityLog append-only; include them in run-integration.
Checks:
1. All four cases covered.
2. npm test runs them.
3. No rules changes needed or made.
Touch only these files. New dependency allowed: @firebase/rules-unit-testing. Keep tests passing. Diff only.
```

#### 9.2 End-to-end tests on desktop and phone (M)

- **What to change:** 1.11 adds the mobile smoke suite only.
- **Why it helps:** Catches UI breakage that unit tests miss.
- **How to build:** Extend Playwright: wizard with each template, desktop drag, mobile action sheet, check-in, calendar sheet and Settings edits.
- **Done when:** CI runs desktop and phone suites on every PR.
- **Model:** Default model; agent mode

**Cursor prompt:**

```text
@playwright.config.ts @tests/e2e/mobile.spec.ts
Create: tests/e2e/setup.spec.ts, tests/e2e/desktop.spec.ts
Add setup.spec (each template) and desktop.spec (drag, context menu, settings edit); reuse helpers from mobile.spec.
Checks:
1. Suites pass locally.
2. CI runs them.
3. Total runtime under 3 minutes.
Touch only these files. No new dependencies. Keep tests passing. Diff only.
```

#### 9.3 Preview deploys (S)

- **What to change:** `work-planner-hosting-cd.yml` deploys production manually with `confirm_prod=deploy`.
- **Why it helps:** Try changes on a real phone before production.
- **How to build:** On PRs deploy to a Hosting preview channel (`firebase hosting:channel:deploy pr-N`); keep the manual production gate.
- **Done when:** Each PR gets a preview URL.
- **Model:** Small, fast model; agent mode

**Cursor prompt:**

```text
@../.github/workflows/work-planner-hosting-cd.yml
Create: ../.github/workflows/work-planner-preview.yml
Add a PR workflow that builds and runs firebase hosting:channel:deploy pr-<number> (7-day expiry) and comments the URL. Leave the prod workflow unchanged.
Checks:
1. PR gets a preview URL.
2. Skips cleanly without secrets.
3. Prod gate unchanged.
Touch only these files. No new dependencies. Keep tests passing. Diff only.
```

#### 9.4 Backups (S)

- **What to change:** There are no backups.
- **Why it helps:** Once the app is the source of truth, losing it means losing the plan.
- **How to build:** Scheduled Firestore exports need Blaze. On Spark, a weekly export reminder (2.5) or a read-only backup by a connected assistant (7.1).
- **Done when:** A dated backup from the last 7 days always exists.
- **Model:** Small, fast model; agent mode

**Cursor prompt:**

```text
@src/lib/export-import.ts @src/lib/reminders.ts
Add a weekly 'Back up now' reminder that triggers exportJson with a dated filename; record lastBackupAt in settings.
Checks:
1. Reminder fires weekly.
2. Filename dated.
3. lastBackupAt updates.
Touch only these files. No new dependencies. Keep tests passing. Diff only.
```

#### 9.5 Privacy guard (S)

- **What to change:** Demo and template data are fictional today, and that must stay true.
- **Why it helps:** The repo is public: reviewers and other users must never see anyone's personal data.
- **How to build:** Extend `scripts/verify-demo-seed.mjs` to scan `src/data/` and committed files for markers listed in a git-ignored local file and fail CI on a match; keep README screenshots from demo mode only.
- **Done when:** CI fails if a listed personal string is committed.
- **Model:** Small, fast model; agent mode

**Cursor prompt:**

```text
@scripts/verify-demo-seed.mjs @.gitignore @../.github/workflows/work-planner-ci.yml
Extend verify-demo-seed to read markers from a git-ignored .privacy-markers file (and a CI secret) and fail on any match in tracked files. Add it to CI.
Checks:
1. A planted marker fails the check.
2. Clean repo passes.
3. Marker file is git-ignored.
Touch only these files. No new dependencies. Keep tests passing. Diff only.
```

## 11. Next 2 weeks

| Day | One 1.5–3 h session | Step |
|---|---|---|
| Day 1 | Tag the course submission (`git tag p2-submission`), branch, shared store for tasks and blocks | 0.1 |
| Day 2 | Remaining collections and localStorage import | 0.2 |
| Day 3 | Offline persistence and the config model (start) | 0.3, 0.4 |
| Day 4 | Config model (finish), date-keyed day types | 0.4 |
| Day 5 | Grid reads the user's config | 0.5 |
| Day 6 | Breakpoints, tokens and bottom tab bar | 1.1 |
| Day 7 | Single-day agenda with swipe, grid scaling | 1.2, 1.7 |
| Day 8 | Touch action sheet and BottomSheet | 1.3 |
| Day 9 | Floating add button and task editor | 1.4 |
| Day 10 | Calm check-in sheet, collapsible Planner | 1.8, 1.5 |
| Day 11 | Calendar month view with day sheet | 1.6 |
| Day 12 | Installable PWA and rename | 1.9 |
| Day 13 | Mobile tests at 360 and 412 px | 1.11 |
| Day 14 | Buffer: fix failures, check on a real phone, review | — |

- **Protect the course submission first.** Grading runs until Tue 17 Nov 2026, 4:30 AM IST. Tag the submitted commit and work on a branch before changing anything.
- **Skip a day without guilt.** Each row is one session; if a day is taken, move the row to the next free day.
- **After day 14.** Next: 1.10 notifications, then Phase 2 (setup wizard, templates, Settings), then 4.4 to 4.6 (free slots and one-tap suggestions).
