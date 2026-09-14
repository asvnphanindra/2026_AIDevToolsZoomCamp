from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import CardStatus
from app.orm import CardRow, ProjectRow, SettingsRow, UserRow
from app.repository import SETTINGS_ID, SEED_PASSWORD, SEED_USERNAME, password_hash


def seed_if_empty(db: Session) -> None:
    """Populate demo user + sample board when the database has no projects."""
    project_count = db.scalar(select(func.count()).select_from(ProjectRow)) or 0
    if project_count > 0:
        return

    if db.get(UserRow, SEED_USERNAME) is None:
        db.add(
            UserRow(
                username=SEED_USERNAME,
                password_hash=password_hash.hash(SEED_PASSWORD),
            )
        )

    if db.get(SettingsRow, SETTINGS_ID) is None:
        db.add(SettingsRow(id=SETTINGS_ID, monday_date=None))

    projects = [
        ProjectRow(id="p-website", name="Website Revamp", color_index=0),
        ProjectRow(id="p-thesis", name="Thesis", color_index=1),
        ProjectRow(id="p-home", name="Home", color_index=2),
    ]
    db.add_all(projects)

    db.add_all(
        [
            CardRow(
                id="c-1",
                project_id="p-website",
                title="Draft new landing copy",
                status=CardStatus.in_progress.value,
                slot_day=0,
                slot_hour=9,
            ),
            CardRow(
                id="c-2",
                project_id="p-website",
                title="Audit old blog images",
                status=CardStatus.todo.value,
                slot_day=None,
                slot_hour=None,
            ),
            CardRow(
                id="c-3",
                project_id="p-thesis",
                title="Read chapter 4 sources",
                status=CardStatus.todo.value,
                slot_day=2,
                slot_hour=14,
            ),
            CardRow(
                id="c-4",
                project_id="p-thesis",
                title="Rewrite methodology intro",
                status=CardStatus.todo.value,
                slot_day=None,
                slot_hour=None,
            ),
            CardRow(
                id="c-5",
                project_id="p-home",
                title="Book boiler service",
                status=CardStatus.completed.value,
                slot_day=None,
                slot_hour=None,
            ),
            CardRow(
                id="c-6",
                project_id="p-home",
                title="Plan weekend groceries",
                status=CardStatus.todo.value,
                slot_day=5,
                slot_hour=11,
            ),
        ]
    )
    db.commit()
