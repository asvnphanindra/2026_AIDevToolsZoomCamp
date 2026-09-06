Commands

- `conda activate module1_chores` - activate the Miniconda env
- `conda env create -f environment.yml` - create the env (first time)
- `pytest` - the whole suite (from `module_1/` with env active)
- `pytest tests/test_home.py` - one test file
- `python manage.py runserver` - local Django server
- `python manage.py spawn_recurring_chores` - spawn open chores from due active templates (today)
- `python manage.py spawn_recurring_chores --as-of YYYY-MM-DD` - same, evaluated as of a fixed date
- `start.bat` - activate env and start the app (double-click or run from Explorer)

Documents
- `_docs/process.md` - how work is organized
- `_docs/plan.md` - product scope
- `_docs/tasks.md` - backlog mapped to GitHub issues
- `_docs/local_smoke.md` - local happy-path smoke checklist
- `environment.yml` - Miniconda env dependencies

Rules

- Use the `module1_chores` Miniconda env; do not use the global Python.
- Dependencies are declared in `environment.yml`. Do not add one without
  asking
