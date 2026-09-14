from __future__ import annotations

import secrets
import uuid
from datetime import date

from pwdlib import PasswordHash
from pwdlib.hashers.bcrypt import BcryptHasher
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Board, BoardSettings, Card, CardStatus, Project, Slot
from app.orm import CardRow, ProjectRow, SettingsRow, TokenRow, UserRow

password_hash = PasswordHash((BcryptHasher(),))

SEED_USERNAME = "demo"
SEED_PASSWORD = "demo123"
SETTINGS_ID = 1


def new_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:12]}"


def _project_from_row(row: ProjectRow) -> Project:
    return Project(id=row.id, name=row.name, colorIndex=row.color_index)


def _card_from_row(row: CardRow) -> Card:
    slot = None
    if row.slot_day is not None and row.slot_hour is not None:
        slot = Slot(day=row.slot_day, hour=row.slot_hour)
    return Card(
        id=row.id,
        projectId=row.project_id,
        title=row.title,
        status=CardStatus(row.status),
        slot=slot,
    )


def _ensure_settings(db: Session) -> SettingsRow:
    row = db.get(SettingsRow, SETTINGS_ID)
    if row is None:
        row = SettingsRow(id=SETTINGS_ID, monday_date=None)
        db.add(row)
        db.flush()
    return row


def get_board(db: Session) -> Board:
    projects = [_project_from_row(p) for p in db.scalars(select(ProjectRow)).all()]
    cards = [_card_from_row(c) for c in db.scalars(select(CardRow)).all()]
    settings = _ensure_settings(db)
    return Board(
        projects=projects,
        cards=cards,
        settings=BoardSettings(mondayDate=settings.monday_date),
    )


def authenticate(db: Session, username: str, password: str) -> str | None:
    user = db.get(UserRow, username)
    if user is None:
        return None
    if not password_hash.verify(password, user.password_hash):
        return None
    token = secrets.token_urlsafe(32)
    db.add(TokenRow(token=token, username=username))
    db.commit()
    return token


def user_for_token(db: Session, token: str) -> str | None:
    row = db.get(TokenRow, token)
    return None if row is None else row.username


def create_project(db: Session, name: str) -> Project:
    used = {p.color_index for p in db.scalars(select(ProjectRow)).all()}
    color_index = 0
    while color_index in used and color_index < 6:
        color_index += 1
    row = ProjectRow(id=new_id("p"), name=name, color_index=color_index)
    db.add(row)
    db.commit()
    db.refresh(row)
    return _project_from_row(row)


def rename_project(db: Session, project_id: str, name: str) -> Project | None:
    row = db.get(ProjectRow, project_id)
    if row is None:
        return None
    row.name = name
    db.commit()
    db.refresh(row)
    return _project_from_row(row)


def delete_project(db: Session, project_id: str) -> bool:
    row = db.get(ProjectRow, project_id)
    if row is None:
        return False
    db.delete(row)
    db.commit()
    return True


def create_card(db: Session, project_id: str, title: str) -> Card | None:
    if db.get(ProjectRow, project_id) is None:
        return None
    row = CardRow(
        id=new_id("c"),
        project_id=project_id,
        title=title,
        status=CardStatus.todo.value,
        slot_day=None,
        slot_hour=None,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _card_from_row(row)


def update_card(
    db: Session,
    card_id: str,
    *,
    title: str | None = None,
    status: CardStatus | None = None,
) -> Card | None:
    row = db.get(CardRow, card_id)
    if row is None:
        return None
    if title is not None:
        row.title = title
    if status is not None:
        row.status = status.value
    db.commit()
    db.refresh(row)
    return _card_from_row(row)


def delete_card(db: Session, card_id: str) -> bool:
    row = db.get(CardRow, card_id)
    if row is None:
        return False
    db.delete(row)
    db.commit()
    return True


def map_card(db: Session, card_id: str, slot: Slot | None) -> Card | None:
    row = db.get(CardRow, card_id)
    if row is None:
        return None
    if slot is None:
        row.slot_day = None
        row.slot_hour = None
    else:
        occupants = db.scalars(
            select(CardRow).where(
                CardRow.id != card_id,
                CardRow.slot_day == slot.day,
                CardRow.slot_hour == slot.hour,
            )
        ).all()
        for occupant in occupants:
            occupant.slot_day = None
            occupant.slot_hour = None
        row.slot_day = slot.day
        row.slot_hour = slot.hour
    db.commit()
    db.refresh(row)
    return _card_from_row(row)


def set_monday_date(db: Session, monday_date: date | None) -> Board:
    settings = _ensure_settings(db)
    settings.monday_date = monday_date
    db.commit()
    return get_board(db)
