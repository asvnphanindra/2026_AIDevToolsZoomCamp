# Module 1 — Household chores app

Phone-friendly shared chore list for **one household**. Members join with an **invite code** (no email, no password). Identity is a browser session that stores `member_id` after you create or join a household.

Part of the [course repo](../README.md).

## Features (v1)

- Invite-code join (admin creator vs member)
- Shared open list: unclaimed / mine / others’ claimed
- One-off chores + admin-managed recurring templates
- Claim, release, and self-complete

## Setup

```text
conda env create -f environment.yml
conda activate module1_chores
python manage.py migrate
```

## Run

```text
python manage.py runserver
```

Or on Windows: double-click `start.bat`.

App URL: **http://127.0.0.1:8000/**

## Tests

```text
pytest
```

## Spawn recurring chores

```text
python manage.py spawn_recurring_chores
```

## Docs

| Doc | Purpose |
|-----|---------|
| [_docs/user-guide.md](_docs/user-guide.md) | How to run and use the app |
| [_docs/plan.md](_docs/plan.md) | Product scope |
| [_docs/tasks.md](_docs/tasks.md) | Backlog / GitHub issues |
| [_docs/local_smoke.md](_docs/local_smoke.md) | Smoke checklist |
| [_docs/agents.md](_docs/agents.md) | Commands for coding agents |
| [_docs/process.md](_docs/process.md) | PM → engineer → QA workflow |
