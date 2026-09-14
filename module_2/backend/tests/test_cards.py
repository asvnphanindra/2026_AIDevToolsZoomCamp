from fastapi.testclient import TestClient


def test_create_update_delete_card(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    created = client.post(
        "/api/cards",
        headers=auth_headers,
        json={"projectId": "p-home", "title": "  Buy milk  "},
    )
    assert created.status_code == 201
    card = created.json()
    assert card["title"] == "Buy milk"
    assert card["status"] == "todo"
    assert card["slot"] is None
    assert card["projectId"] == "p-home"

    updated = client.patch(
        f"/api/cards/{card['id']}",
        headers=auth_headers,
        json={"title": "Buy oat milk", "status": "in_progress"},
    )
    assert updated.status_code == 200
    assert updated.json()["title"] == "Buy oat milk"
    assert updated.json()["status"] == "in_progress"

    deleted = client.delete(f"/api/cards/{card['id']}", headers=auth_headers)
    assert deleted.status_code == 204


def test_create_card_unknown_project(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    response = client.post(
        "/api/cards",
        headers=auth_headers,
        json={"projectId": "missing", "title": "Nope"},
    )
    assert response.status_code == 404


def test_map_and_unmap_card(client: TestClient, auth_headers: dict[str, str]) -> None:
    created = client.post(
        "/api/cards",
        headers=auth_headers,
        json={"projectId": "p-home", "title": "Focus block"},
    )
    card_id = created.json()["id"]

    mapped = client.put(
        f"/api/cards/{card_id}/slot",
        headers=auth_headers,
        json={"slot": {"day": 1, "hour": 10}},
    )
    assert mapped.status_code == 200
    assert mapped.json()["slot"] == {"day": 1, "hour": 10}

    unmapped = client.put(
        f"/api/cards/{card_id}/slot",
        headers=auth_headers,
        json={"slot": None},
    )
    assert unmapped.status_code == 200
    assert unmapped.json()["slot"] is None


def test_mapping_displaces_cell_occupant(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    a = client.post(
        "/api/cards",
        headers=auth_headers,
        json={"projectId": "p-home", "title": "A"},
    ).json()
    b = client.post(
        "/api/cards",
        headers=auth_headers,
        json={"projectId": "p-home", "title": "B"},
    ).json()

    client.put(
        f"/api/cards/{a['id']}/slot",
        headers=auth_headers,
        json={"slot": {"day": 0, "hour": 8}},
    )
    client.put(
        f"/api/cards/{b['id']}/slot",
        headers=auth_headers,
        json={"slot": {"day": 0, "hour": 8}},
    )

    board = client.get("/api/board", headers=auth_headers).json()
    by_id = {c["id"]: c for c in board["cards"]}
    assert by_id[a["id"]]["slot"] is None
    assert by_id[b["id"]]["slot"] == {"day": 0, "hour": 8}


def test_update_card_requires_field(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    response = client.patch("/api/cards/c-1", headers=auth_headers, json={})
    assert response.status_code == 400
