# Local smoke checklist

Short happy-path walkthrough for a new developer. Run all commands from `module_1/` unless noted. No production deploy or CI setup.

## 1. Environment

First time only:

```text
conda env create -f environment.yml
```

Activate (or use `conda run -n module1_chores …` instead of activating):

```text
conda activate module1_chores
```

Expected: prompt shows `(module1_chores)`, or `conda run` uses that env.

## 2. Migrate

```text
conda run -n module1_chores python manage.py migrate
```

Expected: Django applies migrations; SQLite DB is ready (no errors).

## 3. Start the server

Either double-click / run `start.bat` (activates `module1_chores` and runs `runserver`), or:

```text
conda run -n module1_chores python manage.py runserver
```

Expected: server at http://127.0.0.1:8000/ (message matches `start.bat`).

## 4. Temporary session stub (until #11)

Join/create-household UI is not shipped yet. Seed an admin and attach `session["member_id"]` so list/admin flows work in the browser.

In a second terminal (from `module_1/`):

```text
conda run -n module1_chores python manage.py shell
```

Then:

```python
from django.contrib.sessions.backends.db import SessionStore
from chores.models import Household, Member

household = Household.objects.create(name="Smoke House", invite_code="SMOKE-INVITE-1")
admin = Member.objects.create(
    household=household,
    display_name="Alex",
    role=Member.Role.ADMIN,
)
print("member_id=", admin.pk)

session = SessionStore()
session["member_id"] = admin.pk
session.create()
print("sessionid=", session.session_key)
```

In the browser (DevTools → Application → Cookies for `127.0.0.1`):

1. Add or edit cookie name `sessionid`
2. Set value to the printed `sessionid`
3. Reload http://127.0.0.1:8000/

Expected: page loads as household **Smoke House**, signed in as **Alex** (not the 401 denied page).

## 5. Join / create household (placeholder — #11)

> **TODO under [#11](https://github.com/asvnphanindra/2026_AIDevToolsZoomCamp/issues/11):** replace the temporary session stub with real create-household / invite-join steps and document the UI paths and expected outcomes here.

## 6. Shared list UI

Open http://127.0.0.1:8000/ (`/`).

Expected: household name header, “Add one-off”, sections **Unclaimed**, **Mine**, **Others’ claimed**, and link **Admin / templates**.

## 7. One-off → claim → complete → release

On `/`:

1. **Add one-off** — enter a title (e.g. `Take out trash`) → **Add**.  
   Expected: chore appears under **Unclaimed**.
2. **Claim** — click **Claim** on that chore.  
   Expected: chore moves to **Mine** (gone from Unclaimed).
3. **Release** (optional check) — click **Release**.  
   Expected: chore returns to **Unclaimed**. Claim again so it is under **Mine**.
4. **Complete** — click **Complete**.  
   Expected: chore disappears from the list (done chores are excluded).

## 8. Admin UI + invite code

Open http://127.0.0.1:8000/household/admin/ (or use **Admin / templates** from the list). Requires admin role (the stub member above).

Expected:

- **Invite code** section with readonly input `#invite-code` showing `SMOKE-INVITE-1` (copyable).
- **Create template** form (title, cadence daily/weekly, anchor date).
- After **Create**, template listed under **Templates** as active; edit fields and **Save**, or **Deactivate**.

## 9. Spawn from template (placeholder — #12)

> **TODO under [#12](https://github.com/asvnphanindra/2026_AIDevToolsZoomCamp/issues/12):** document the management command or trigger that spawns open chores from active templates, plus the expected Unclaimed list outcome.
