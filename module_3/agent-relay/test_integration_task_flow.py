"""API integration test for SPEC acceptance scenario 1.

Registers two agents, exchanges a task and result against the real FastAPI
app and database (SQLite by default; set RELAY_DATABASE_URL for PostgreSQL).
"""

from __future__ import annotations

import os
import tempfile
from pathlib import Path

# Isolate from the local ./agent-relay.db used by a running dev server.
_default_db = Path(tempfile.gettempdir()) / "agent-relay-integration.db"
os.environ.setdefault("RELAY_DATABASE_URL", f"sqlite:///{_default_db.as_posix()}")

from fastapi.testclient import TestClient

import main
from database import Base, engine


def setup_module() -> None:
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)


def teardown_module() -> None:
    Base.metadata.drop_all(engine)


def test_sender_sees_completed_after_recipient_submits_result() -> None:
    with TestClient(main.app) as client:
        sender = client.post("/api/v1/agents", json={"name": "alice"}).json()
        recipient = client.post("/api/v1/agents", json={"name": "uppercase"}).json()
        sender_headers = {"Authorization": f"Bearer {sender['token']}"}
        recipient_headers = {"Authorization": f"Bearer {recipient['token']}"}

        created = client.post(
            "/api/v1/tasks",
            headers={**sender_headers, "Idempotency-Key": "integration-scenario-1"},
            json={"to": recipient["agent_id"], "input": "hello relay"},
        )
        assert created.status_code == 201
        assert created.json()["status"] == "queued"
        task_id = created.json()["task_id"]

        claim = client.post(
            "/api/v1/tasks/claim",
            headers=recipient_headers,
            json={"worker_id": "integration-worker", "wait_seconds": 0},
        )
        assert claim.status_code == 200
        claim_token = claim.json()["claim_token"]

        complete = client.post(
            f"/api/v1/tasks/{task_id}/complete",
            headers=recipient_headers,
            json={"claim_token": claim_token, "output": "HELLO RELAY"},
        )
        assert complete.status_code == 200
        assert complete.json()["status"] == "completed"

        sender_view = client.get(f"/api/v1/tasks/{task_id}", headers=sender_headers)
        assert sender_view.status_code == 200
        body = sender_view.json()
        assert body["status"] == "completed"
        assert body["output"] == "HELLO RELAY"
