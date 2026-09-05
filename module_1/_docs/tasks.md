# Backlog — household chores tool (v1)

Stack for this backlog: **Django + SQLite**, run locally. Product scope lives in `plan.md`.

Each task is written so someone can pick it up without reading the other tasks. Prefer small vertical slices; keep auth invite-code based (no email).

---

## 1. Empty Django project with a passing test

Goal: Bootstrap a local Django + SQLite app that runs and has one green test.

Description: Create a new Django project under `module_1` (or an agreed app folder) with SQLite, a minimal settings layout, and a way to run the test suite. Add a trivial passing unit test (for example asserting `1 + 1 == 2` or that the Django setup loads) so CI-less local `manage.py test` (or `pytest`) succeeds. Do not build product features yet.

---

## 2. Domain models for household, members, and chores

Goal: Persist the core entities needed for one household’s claim-based chore list.

Description: In the Django app, add models for Household, Member (display name, role admin/member, link to household), Chore/Task instances (title, status open/claimed/done, optional claimer, timestamps), and RecurringTemplate (title, cadence fields, household, admin-managed). Use SQLite migrations. Include model tests for creating a household with a member and a chore; do not build HTTP UI yet unless needed for tests.

---

## 3. Invite code join flow

Goal: Let a person join one household with an invite link/code and get a session identity.

Description: Implement household invite codes (generate/store on Household) and endpoints or views to create a household (first user becomes admin) and join via code with a display name. Establish a server session (or equivalent) so later requests know which Member is acting. No email. Cover join success, bad code, and “already named member in session” with tests.

---

## 4. Add one-off chores (any member)

Goal: Any household member can put a one-off chore on the open shared list.

Description: Add an authenticated-by-session way for any Member to create a one-off chore/task in `open` status on their household’s list. Validate title and household scoping so members cannot write into another household. Tests should create two households and prove isolation plus successful create for a member.

---

## 5. Admin-managed recurring templates

Goal: Only admins can create and edit recurring chore templates.

Description: Build create/update (and optionally deactivate) for RecurringTemplate, restricted to Members with admin role. Templates define title and recurrence (e.g. daily/weekly + anchor). Non-admins must get a clear denial. Tests should cover admin success and member forbidden paths. Spawning open tasks from templates can be a separate task.

---

## 6. Spawn open tasks from recurring templates

Goal: Turn due recurring templates into open chores on the shared list.

Description: Implement a deterministic spawn mechanism (management command and/or “run on list load”) that creates an `open` chore when a template is due and no incomplete instance already exists for that period. Keep logic testable with frozen dates. Do not add reminders or notifications. Document how to run the command locally if you use one.

---

## 7. Claim an open chore

Goal: A member can claim an open chore so it becomes theirs until done or released.

Description: Add an action that moves an `open` chore to `claimed` and sets the claimer to the current Member. Reject claims on chores that are already claimed or done, and enforce household membership. Use a safe update (e.g. conditional update) so two people cannot both claim the same chore. Tests should include a concurrent-style double-claim case.

---

## 8. Release a claimed chore

Goal: The claimer can return a chore to the open list without completing it.

Description: Add a release action that only the current claimer can perform on a `claimed` chore, clearing the claimer and setting status back to `open`. Other members and admins should not release someone else’s claim in v1 (unless you explicitly document admin override—default is claimer-only). Tests for success and forbidden release.

---

## 9. Self-mark chore complete

Goal: The claimer can trust-mark a claimed chore as done.

Description: Add a complete action that only the claimer can run on a `claimed` chore, setting status to `done` (and recording completed_at if useful). No photo proof and no peer confirmation. Done chores should not be claimable again. Tests for claimer success, non-claimer denied, and open chore cannot be completed.

---

## 10. Shared list UI: unclaimed, mine, others claimed

Goal: Show a phone-friendly web page of the household’s chores segmented by claim state.

Description: Build a Django-rendered (templates; HTMX optional) mobile-friendly list for the logged-in member: unclaimed/open, mine (claimed by me), and others’ claimed. Wire buttons/actions for claim/release/complete where allowed, and a simple form to add a one-off. Stay within one household; no fairness stats or notifications. Include at least one view/integration test that the segments render expected chores.

---

## 11. Admin UI for templates and invite code

Goal: Give admins a simple local UI to manage templates and copy the household invite code.

Description: Add phone-friendly pages (or extend the main UI) where admins can see the invite code, create/edit recurring templates, and where non-admins cannot access template management. Link from the main chores list. Tests should ensure member users cannot open admin-only template routes.

---

## 12. End-to-end local smoke script or checklist

Goal: Prove a new developer can run the happy path locally without reading tribal knowledge.

Description: Add a short `_docs/local_smoke.md` (or a scripted test) that walks: install deps, migrate, runserver, create household, join with second session/user, add one-off, claim, complete, release, and spawn from a template. Keep it accurate to the actual commands in the repo. No production deploy steps.
