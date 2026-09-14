from fastapi.testclient import TestClient

from app.repository import SEED_PASSWORD, SEED_USERNAME


def test_login_success(client: TestClient) -> None:
    response = client.post(
        "/api/auth/login",
        json={"username": SEED_USERNAME, "password": SEED_PASSWORD},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert isinstance(body["access_token"], str)
    assert body["access_token"]


def test_login_rejects_bad_password(client: TestClient) -> None:
    response = client.post(
        "/api/auth/login",
        json={"username": SEED_USERNAME, "password": "wrong"},
    )
    assert response.status_code == 401


def test_protected_routes_require_bearer(client: TestClient) -> None:
    assert client.get("/api/board").status_code == 401
    assert client.post("/api/projects", json={"name": "X"}).status_code == 401


def test_invalid_token_is_rejected(client: TestClient) -> None:
    response = client.get(
        "/api/board",
        headers={"Authorization": "Bearer not-a-real-token"},
    )
    assert response.status_code == 401
