import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.store import SEED_PASSWORD, SEED_USERNAME, store


@pytest.fixture(autouse=True)
def reset_store() -> None:
    store.reset()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def auth_headers(client: TestClient) -> dict[str, str]:
    response = client.post(
        "/api/auth/login",
        json={"username": SEED_USERNAME, "password": SEED_PASSWORD},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
