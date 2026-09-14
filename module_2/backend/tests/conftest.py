import pytest
from fastapi.testclient import TestClient

from app import db as db_module
from app.db import Base, init_db
from app.main import app
from app.repository import SEED_PASSWORD, SEED_USERNAME
from app.seed import seed_if_empty


@pytest.fixture()
def client() -> TestClient:
    """Fresh in-memory SQLite DB per test (engine-agnostic URL)."""
    db_module.reset_engine("sqlite://")
    Base.metadata.drop_all(bind=db_module.engine)
    init_db()
    with db_module.SessionLocal() as db:
        seed_if_empty(db)

    with TestClient(app) as test_client:
        yield test_client

    Base.metadata.drop_all(bind=db_module.engine)


@pytest.fixture
def auth_headers(client: TestClient) -> dict[str, str]:
    response = client.post(
        "/api/auth/login",
        json={"username": SEED_USERNAME, "password": SEED_PASSWORD},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
