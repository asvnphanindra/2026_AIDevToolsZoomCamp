from fastapi.testclient import TestClient


def test_create_rename_delete_project(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    created = client.post(
        "/api/projects",
        headers=auth_headers,
        json={"name": "  Side quest  "},
    )
    assert created.status_code == 201
    project = created.json()
    assert project["name"] == "Side quest"
    assert "id" in project
    assert isinstance(project["colorIndex"], int)

    renamed = client.patch(
        f"/api/projects/{project['id']}",
        headers=auth_headers,
        json={"name": "Main quest"},
    )
    assert renamed.status_code == 200
    assert renamed.json()["name"] == "Main quest"

    deleted = client.delete(f"/api/projects/{project['id']}", headers=auth_headers)
    assert deleted.status_code == 204

    missing = client.patch(
        f"/api/projects/{project['id']}",
        headers=auth_headers,
        json={"name": "Gone"},
    )
    assert missing.status_code == 404


def test_delete_project_removes_its_cards(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    response = client.delete("/api/projects/p-website", headers=auth_headers)
    assert response.status_code == 204

    board = client.get("/api/board", headers=auth_headers).json()
    assert all(p["id"] != "p-website" for p in board["projects"])
    assert all(c["projectId"] != "p-website" for c in board["cards"])


def test_create_project_rejects_blank_name(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    response = client.post(
        "/api/projects",
        headers=auth_headers,
        json={"name": "   "},
    )
    assert response.status_code == 422
