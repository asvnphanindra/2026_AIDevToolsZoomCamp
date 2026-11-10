# Work Planner — Build Plan

**Goal:** Certificate project (≥10/24 + 3 peer reviews). Fresh app under `project/`. Stack remains Firebase Auth + Firestore (+ Hosting later). Deadline: Project 2 — 16 Nov 2026 23:00 UTC.

## Order of operations (locked)

1. **Local first:** scaffold, emulators, one-command run, unit + integration tests.
2. **Ship for course review** with a clear local/Docker demo (Compose + Emulator Suite).
3. **Firebase Hosting deploy only after course submission** (optional public URL for personal use / later polish). Spec may still name Hosting as the intended production host.

## Decisions locked

- Fresh folder under course `project/` (not overwrite `module_2`).
- Copy/adapt Weekslot UI patterns where they fit.
- Firebase Auth (Google) + Firestore; Hosting is post-submission.
- Commit and push regularly. All project files stay under `project/`.

## Sections

### A. Spec & agent setup (this PR)
README · product-spec · public Issues tracker · agent team · `AGENTS.md` + modular docs.

### B. App core (MVP) — local
Firebase project config for emulators · Auth · data model · day/week views · horizons (thin) · one-command local run.

### C. Quality — still local-first
Tests · Docker Compose (emulators + UI) · CI on PR · observability/alert/on-call as required for scoring.

### D. After submission
Firebase Hosting (demo project) if a public URL is desired · personal project stays private.

## Out of scope until asked

- Native mobile · non-Google auth beyond Firebase needs · full PNG-parity before MVP.
