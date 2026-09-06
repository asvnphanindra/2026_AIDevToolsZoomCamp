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

## 4. Create a household

Open http://127.0.0.1:8000/ (or any protected page) without a session — you should see **Access denied** with links to create/join. Or go directly to:

http://127.0.0.1:8000/household/create/

1. Enter a **Household name** (e.g. `Smoke House`)
2. Enter your **display name** (e.g. `Alex`)
3. Submit **Create household**

Expected:

- Redirect to `/` (shared list) signed in as **Alex** for **Smoke House**
- Session cookie `sessionid` is set; the server stores `member_id` for that Member
- You are household **admin** (Admin / templates works)

## 5. Join with invite code

From the admin page (or note the code after create via JSON/`#invite-code`):

1. As the admin, open http://127.0.0.1:8000/household/admin/
2. Copy the **Invite code** from the readonly `#invite-code` field
3. In another browser / private window (or clear cookies), open http://127.0.0.1:8000/household/join/
4. Paste the invite code, enter a different display name (e.g. `Sam`), submit **Join household**

Expected:

- Redirect to `/` signed in as **Sam** for the same household
- Session `member_id` is Sam’s Member pk; role is **member** (not admin)
- Invalid/blank invite codes stay on the join page with an error; no new Member

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

Open http://127.0.0.1:8000/household/admin/ (or use **Admin / templates** from the list). Requires admin role (the creator from step 4).

Expected:

- **Invite code** section with readonly input `#invite-code` showing the household’s generated code (copyable).
- **Create template** form (title, cadence daily/weekly, anchor date).
- After **Create**, template listed under **Templates** as active; edit fields and **Save**, or **Deactivate**.

## 9. Spawn from template (placeholder — #12)

> **TODO under [#12](https://github.com/asvnphanindra/2026_AIDevToolsZoomCamp/issues/12):** document the management command or trigger that spawns open chores from active templates, plus the expected Unclaimed list outcome.
