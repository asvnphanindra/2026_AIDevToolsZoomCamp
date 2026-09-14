from fastapi.testclient import TestClient


def test_set_monday_date(client: TestClient, auth_headers: dict[str, str]) -> None:
    response = client.put(
        "/api/settings/week",
        headers=auth_headers,
        json={"mondayDate": "2026-09-14"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["settings"]["mondayDate"] == "2026-09-14"
    assert "projects" in body
    assert "cards" in body


def test_clear_monday_date(client: TestClient, auth_headers: dict[str, str]) -> None:
    client.put(
        "/api/settings/week",
        headers=auth_headers,
        json={"mondayDate": "2026-09-14"},
    )
    response = client.put(
        "/api/settings/week",
        headers=auth_headers,
        json={"mondayDate": None},
    )
    assert response.status_code == 200
    assert response.json()["settings"]["mondayDate"] is None
