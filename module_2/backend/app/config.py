from __future__ import annotations

import os

# SQLAlchemy URL. Defaults to a local SQLite file.
# Examples:
#   sqlite:///./weekslot.db
#   sqlite:///:memory:
#   postgresql+psycopg://user:pass@localhost:5432/weekslot
DATABASE_URL_ENV = "DATABASE_URL"
DEFAULT_DATABASE_URL = "sqlite:///./weekslot.db"


def get_database_url() -> str:
    return os.environ.get(DATABASE_URL_ENV, DEFAULT_DATABASE_URL)
