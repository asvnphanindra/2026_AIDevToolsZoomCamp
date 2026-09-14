from __future__ import annotations

import secrets
from copy import deepcopy
from datetime import date

from pwdlib import PasswordHash
from pwdlib.hashers.bcrypt import BcryptHasher

from app.models import (
    Board,
    BoardSettings,
    Card,
    CardStatus,
    Project,
    Slot,
    User,
)

password_hash = PasswordHash((BcryptHasher(),))

FIRST_HOUR = 6
LAST_HOUR = 23

SEED_USERNAME = "demo"
SEED_PASSWORD = "demo123"


def seed_board() -> Board:
    """Same sample board the frontend mock uses, so the UI has content immediately."""
    return Board(
        projects=[
            Project(id="p-website", name="Website Revamp", colorIndex=0),
            Project(id="p-thesis", name="Thesis", colorIndex=1),
            Project(id="p-home", name="Home", colorIndex=2),
        ],
        cards=[
            Card(
                id="c-1",
                projectId="p-website",
                title="Draft new landing copy",
                status=CardStatus.in_progress,
                slot=Slot(day=0, hour=9),
            ),
            Card(
                id="c-2",
                projectId="p-website",
                title="Audit old blog images",
                status=CardStatus.todo,
                slot=None,
            ),
            Card(
                id="c-3",
                projectId="p-thesis",
                title="Read chapter 4 sources",
                status=CardStatus.todo,
                slot=Slot(day=2, hour=14),
            ),
            Card(
                id="c-4",
                projectId="p-thesis",
                title="Rewrite methodology intro",
                status=CardStatus.todo,
                slot=None,
            ),
            Card(
                id="c-5",
                projectId="p-home",
                title="Book boiler service",
                status=CardStatus.completed,
                slot=None,
            ),
            Card(
                id="c-6",
                projectId="p-home",
                title="Plan weekend groceries",
                status=CardStatus.todo,
                slot=Slot(day=5, hour=11),
            ),
        ],
        settings=BoardSettings(mondayDate=None),
    )


class Store:
    """In-memory board + auth state for the personal planner API."""

    def __init__(self) -> None:
        self.reset()

    def reset(self) -> None:
        self.board = seed_board()
        self._id_counter = 100
        self.users: dict[str, User] = {
            SEED_USERNAME: User(
                username=SEED_USERNAME,
                password_hash=password_hash.hash(SEED_PASSWORD),
            )
        }
        self.tokens: dict[str, str] = {}

    def next_id(self, prefix: str) -> str:
        self._id_counter += 1
        return f"{prefix}-{self._id_counter}"

    def get_board(self) -> Board:
        return deepcopy(self.board)

    def authenticate(self, username: str, password: str) -> str | None:
        user = self.users.get(username)
        if user is None:
            return None
        if not password_hash.verify(password, user.password_hash):
            return None
        token = secrets.token_urlsafe(32)
        self.tokens[token] = username
        return token

    def user_for_token(self, token: str) -> str | None:
        return self.tokens.get(token)

    def find_project(self, project_id: str) -> Project | None:
        return next((p for p in self.board.projects if p.id == project_id), None)

    def find_card(self, card_id: str) -> Card | None:
        return next((c for c in self.board.cards if c.id == card_id), None)

    def create_project(self, name: str) -> Project:
        used = {p.colorIndex for p in self.board.projects}
        color_index = 0
        while color_index in used and color_index < 6:
            color_index += 1
        project = Project(id=self.next_id("p"), name=name, colorIndex=color_index)
        self.board.projects.append(project)
        return deepcopy(project)

    def rename_project(self, project_id: str, name: str) -> Project | None:
        project = self.find_project(project_id)
        if project is None:
            return None
        project.name = name
        return deepcopy(project)

    def delete_project(self, project_id: str) -> bool:
        project = self.find_project(project_id)
        if project is None:
            return False
        self.board.projects = [p for p in self.board.projects if p.id != project_id]
        self.board.cards = [c for c in self.board.cards if c.projectId != project_id]
        return True

    def create_card(self, project_id: str, title: str) -> Card | None:
        if self.find_project(project_id) is None:
            return None
        card = Card(
            id=self.next_id("c"),
            projectId=project_id,
            title=title,
            status=CardStatus.todo,
            slot=None,
        )
        self.board.cards.append(card)
        return deepcopy(card)

    def update_card(
        self,
        card_id: str,
        *,
        title: str | None = None,
        status: CardStatus | None = None,
    ) -> Card | None:
        card = self.find_card(card_id)
        if card is None:
            return None
        if title is not None:
            card.title = title
        if status is not None:
            card.status = status
        return deepcopy(card)

    def delete_card(self, card_id: str) -> bool:
        card = self.find_card(card_id)
        if card is None:
            return False
        self.board.cards = [c for c in self.board.cards if c.id != card_id]
        return True

    def map_card(self, card_id: str, slot: Slot | None) -> Card | None:
        card = self.find_card(card_id)
        if card is None:
            return None
        if slot is None:
            card.slot = None
            return deepcopy(card)
        for other in self.board.cards:
            if (
                other.id != card_id
                and other.slot is not None
                and other.slot.day == slot.day
                and other.slot.hour == slot.hour
            ):
                other.slot = None
        card.slot = Slot(day=slot.day, hour=slot.hour)
        return deepcopy(card)

    def set_monday_date(self, monday_date: date | None) -> Board:
        self.board.settings.mondayDate = monday_date
        return self.get_board()


store = Store()
