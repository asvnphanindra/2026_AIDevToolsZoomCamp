# Household chores app — user & developer guide

Phone-friendly shared chore list for **one household**. Members join with an **invite code** (no email, no password). Identity is a **browser session** that stores `member_id` after you create or join a household.

Related docs: product scope in `plan.md`, smoke checklist in `local_smoke.md`, commands in `agents.md`.

---

## 1. Prerequisites and start

All commands below run from `module_1/` unless noted.

### First-time setup

```text
conda env create -f environment.yml
conda run -n module1_chores python manage.py migrate
```

### Start the server

**Option A — Windows helper**

Double-click or run `start.bat` (activates `module1_chores` and starts the server).

**Option B — command line**

```text
conda activate module1_chores
python manage.py runserver
```

Or without activating:

```text
conda run -n module1_chores python manage.py runserver
```

App URL: **http://127.0.0.1:8000/**

Stop with `Ctrl+C`.

### Auth model (important)

| Concept | How it works |
|--------|----------------|
| Sign-in | Creating or joining a household sets a session cookie |
| Session key | `member_id` → `Member` primary key |
| Roles | `admin` (creator) or `member` (joined via invite) |
| Sign-out | Clear site cookies / use a private window |
| Passwords | None — there is no username/password login |

If you see **Access denied**, you have no valid session. Create or join first.

---

## 2. Everyday usage (browser)

### Step-by-step happy path

1. Open http://127.0.0.1:8000/household/create/
2. Enter a **household name** and your **display name** → submit  
   You become **admin** and land on the shared list `/`.
3. Open **Admin / templates** (or http://127.0.0.1:8000/household/admin/)
4. Copy the **Invite code**
5. In another browser / private window: http://127.0.0.1:8000/household/join/  
   Paste the code + a **different** display name → that person is a **member**
6. On `/`: add one-offs, claim, release, complete
7. As admin: create recurring templates on the admin page
8. Spawn due templates into open chores (see [§5 Management commands](#5-management-commands))

### Roles

| Action | Admin | Member |
|--------|:-----:|:------:|
| View shared list | ✓ | ✓ |
| Add one-off chore | ✓ | ✓ |
| Claim / release / complete | ✓ | ✓ |
| Create / edit / deactivate templates | ✓ | ✗ |
| See invite code on admin page | ✓ | ✗ |

---

## 3. All pages (HTML views)

Base URL: `http://127.0.0.1:8000`

| URL | Who | What you see / do |
|-----|-----|-------------------|
| `/` | Signed-in member | Shared list: **Unclaimed**, **Mine**, **Others’ claimed**; form to add a one-off; claim/release/complete buttons; link to admin |
| `/` (no session) | Anyone | **Access denied** with links to create/join |
| `/household/create/` | Anyone | Form: household name + display name. Creates household, invite code, first **admin**, sets session |
| `/household/join/` | Anyone | Form: invite code + display name. Creates **member**, sets session. Duplicate display name in same household is rejected |
| `/household/admin/` | **Admin** only | Invite code (readonly), create/edit/deactivate recurring templates |
| `/household/admin/` | Member / anonymous | Access denied (401) or forbidden (403) |

Django’s built-in site at `/admin/` exists but **product models are not registered** there. Prefer the app UI or SQLite / shell (below) to inspect data.

---

## 4. API-style endpoints (JSON or form POST)

These power the UI and can be called with a session cookie. Prefer the HTML forms on `/` and `/household/admin/` unless you are testing.

**Session required** for all chore/template actions below. Send CSRF token for form POSTs from the browser; JSON clients should include the session cookie from create/join.

| Method | URL | Role | Body fields | Success |
|--------|-----|------|-------------|---------|
| POST | `/chores/one-off/` | any member | `title` | JSON chore (`open`) |
| POST | `/chores/one-off/html/` | any member | `title` | Redirect to `/` |
| POST | `/chores/<id>/claim/` | any member | — | JSON claimed chore |
| POST | `/chores/<id>/claim/html/` | any member | — | Redirect to `/` |
| POST | `/chores/<id>/release/` | claimer only | — | JSON open chore |
| POST | `/chores/<id>/release/html/` | claimer only | — | Redirect to `/` |
| POST | `/chores/<id>/complete/` | claimer only | — | JSON done chore |
| POST | `/chores/<id>/complete/html/` | claimer only | — | Redirect to `/` |
| POST | `/chores/templates/` | admin | `title`, `cadence` (`daily`/`weekly`), `anchor_date` | JSON template |
| POST | `/chores/templates/html/` | admin | same | Redirect to admin |
| POST | `/chores/templates/<id>/` | admin | title / cadence / anchor_date (partial OK) | JSON template |
| POST | `/chores/templates/<id>/html/` | admin | same | Redirect to admin |
| POST | `/chores/templates/<id>/deactivate/` | admin | — | JSON template (`is_active=false`) |
| POST | `/chores/templates/<id>/deactivate/html/` | admin | — | Redirect to admin |

**Rules worth knowing**

- One-offs always land as `open` with no claimer and no template; client-supplied household/status/claimer/template are ignored.
- Claim only works on `open` chores; concurrent double-claim is rejected.
- Release / complete only work for the current claimer on a `claimed` chore.
- Done chores leave the shared list (not claimable again).
- Admins cannot manage another household’s templates.

---

## 5. Management commands

```text
conda run -n module1_chores python manage.py spawn_recurring_chores
conda run -n module1_chores python manage.py spawn_recurring_chores --as-of YYYY-MM-DD
```

- Creates an **open** chore for each **active** template that is due for the period and has no incomplete (`open`/`claimed`) instance for that period.
- Deactivated templates never spawn.
- Re-running for the same period does not duplicate while an incomplete instance exists.
- Refresh `/` afterward to see new items under **Unclaimed**.

Other useful Django commands:

```text
conda run -n module1_chores python manage.py migrate
conda run -n module1_chores python manage.py makemigrations
conda run -n module1_chores python manage.py shell
conda run -n module1_chores pytest
```

---

## 6. Database

### Location

SQLite file:

```text
module_1/db.sqlite3
```

Configured in `config/settings.py` (`DATABASES['default']`). Created/updated by `migrate`.

### Tables (product models)

| Model | Table (approx.) | Purpose |
|-------|-----------------|---------|
| `Household` | `chores_household` | Name + `invite_code` |
| `Member` | `chores_member` | Display name, role `admin`/`member`, FK to household |
| `Chore` | `chores_chore` | Title, status `open`/`claimed`/`done`, claimer, optional template, `period_key`, timestamps |
| `RecurringTemplate` | `chores_recurringtemplate` | Title, cadence `daily`/`weekly`, `anchor_date`, `is_active` |

Django also keeps `django_session`, `auth_*`, etc. App identity uses **sessions + Member**, not Django `User`.

### Browse with a GUI

Open `module_1/db.sqlite3` in any SQLite browser (DB Browser for SQLite, VS Code SQLite extension, etc.). Useful queries:

```sql
SELECT id, name, invite_code FROM chores_household;
SELECT id, household_id, display_name, role FROM chores_member;
SELECT id, title, status, claimer_id, template_id, period_key FROM chores_chore;
SELECT id, title, cadence, anchor_date, is_active FROM chores_recurringtemplate;
```

### Browse with Django shell

```text
conda run -n module1_chores python manage.py shell
```

```python
from chores.models import Household, Member, Chore, RecurringTemplate

Household.objects.values("id", "name", "invite_code")
Member.objects.values("id", "display_name", "role", "household_id")
Chore.objects.values("id", "title", "status", "claimer_id")
RecurringTemplate.objects.values("id", "title", "cadence", "is_active")
```

### Reset local data

Stop the server, then either:

- Delete `module_1/db.sqlite3` and run `migrate` again, or  
- Delete rows via shell / SQL.

You will need to create/join a household again (new session).

---

## 7. Project layout (quick map)

| Path | Role |
|------|------|
| `manage.py` | Django entrypoint |
| `config/` | Settings, root URLs, WSGI/ASGI |
| `chores/` | Models, views, services, templates, URLs |
| `chores/templates/chores/` | HTML pages |
| `db.sqlite3` | Local database (gitignored if configured) |
| `environment.yml` | Miniconda env `module1_chores` |
| `start.bat` | Activate env + `runserver` |
| `_docs/` | Process, plan, tasks, smoke, this guide |
| `tests/` | Pytest suite |

---

## 8. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Access denied on `/` or admin | No session / stale `member_id` | Create or join again; clear cookies |
| Forbidden on admin page | Signed in as `member` | Use the household **creator** session, or create your own household |
| Display name already taken | Name unique per household | Choose another name on join |
| Invite code not found | Typo / wrong DB / reset DB | Copy code from admin page of a living household |
| Empty list after templates | Spawn not run | `python manage.py spawn_recurring_chores` |
| Server / import errors | Wrong Python | Use `module1_chores` only |
| `db.sqlite3` missing | Never migrated | `python manage.py migrate` |

---

## 9. Out of scope (v1)

No multi-household accounts, email, passwords, push reminders, fairness scores, photo proof, or production deploy. See `plan.md`.
