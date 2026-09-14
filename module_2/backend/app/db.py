from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_database_url


class Base(DeclarativeBase):
    pass


def _is_sqlite(url: str) -> bool:
    return url.startswith("sqlite:")


def create_db_engine(url: str | None = None, *, echo: bool = False) -> Engine:
    """Build a SQLAlchemy engine from a URL (SQLite today, Postgres later)."""
    database_url = url or get_database_url()
    connect_args: dict = {}
    engine_kwargs: dict = {"echo": echo, "connect_args": connect_args}

    if _is_sqlite(database_url):
        # Needed for FastAPI's multi-threaded request handling with SQLite.
        connect_args["check_same_thread"] = False
        # In-memory SQLite needs a shared pool so all sessions see the same DB.
        if database_url in {"sqlite://", "sqlite:///:memory:"}:
            from sqlalchemy.pool import StaticPool

            engine_kwargs["poolclass"] = StaticPool

    engine = create_engine(database_url, **engine_kwargs)

    if _is_sqlite(database_url):

        @event.listens_for(engine, "connect")
        def _set_sqlite_pragma(dbapi_connection, _connection_record) -> None:  # noqa: ANN001
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

    return engine


engine = create_db_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db(bind: Engine | None = None) -> None:
    # Import ORM models so metadata is registered.
    from app import orm as _orm  # noqa: F401

    Base.metadata.create_all(bind=bind or engine)


def reset_engine(url: str) -> Engine:
    """Replace the global engine/session factory (used by tests)."""
    global engine, SessionLocal
    engine.dispose()
    engine = create_db_engine(url)
    SessionLocal = sessionmaker(
        bind=engine, autoflush=False, autocommit=False, expire_on_commit=False
    )
    return engine
