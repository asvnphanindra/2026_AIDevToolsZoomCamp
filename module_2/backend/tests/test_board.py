from fastapi.testclient import TestClient


def test_get_board_returns_seed_data(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    response = client.get("/api/board", headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert len(body["projects"]) == 3
    assert len(body["cards"]) == 6
    assert body["settings"]["mondayDate"] is None
    assert {p["id"] for p in body["projects"]} == {
        "p-website",
        "p-thesis",
        "p-home",
    }
    mapped = [c for c in body["cards"] if c["slot"] is not None]
    assert len(mapped) == 3
