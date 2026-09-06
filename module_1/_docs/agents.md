Commands

- `conda activate module1_chores` - activate the Miniconda env
- `conda env create -f environment.yml` - create the env (first time)
- `pytest` - the whole suite (from `module_1/` with env active)
- `pytest tests/test_home.py` - one test file
- `python manage.py runserver` - local Django server

Documents
- `_docs/process.md` - how work is organized

Rules

- Use the `module1_chores` Miniconda env; do not use the global Python.
- Dependencies are declared in `environment.yml`. Do not add one without
  asking
