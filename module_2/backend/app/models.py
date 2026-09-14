from __future__ import annotations

from datetime import date
from enum import Enum
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator


class CardStatus(str, Enum):
    todo = "todo"
    in_progress = "in_progress"
    completed = "completed"


class Slot(BaseModel):
    day: Annotated[int, Field(ge=0, le=6)]
    hour: Annotated[int, Field(ge=6, le=23)]


class Project(BaseModel):
    id: str
    name: str
    colorIndex: int = Field(ge=0)


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Project name is required")
        return trimmed


class ProjectRename(BaseModel):
    name: str = Field(min_length=1)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Project name is required")
        return trimmed


class Card(BaseModel):
    id: str
    projectId: str
    title: str
    status: CardStatus
    slot: Slot | None


class CardCreate(BaseModel):
    projectId: str
    title: str = Field(min_length=1)

    @field_validator("title")
    @classmethod
    def strip_title(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Card title is required")
        return trimmed


class CardUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, min_length=1)
    status: CardStatus | None = None

    @field_validator("title")
    @classmethod
    def strip_title(cls, value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Card title is required")
        return trimmed


class MapCardRequest(BaseModel):
    slot: Slot | None


class BoardSettings(BaseModel):
    mondayDate: date | None


class SetMondayDateRequest(BaseModel):
    mondayDate: date | None


class Board(BaseModel):
    projects: list[Project]
    cards: list[Card]
    settings: BoardSettings


class LoginRequest(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class User(BaseModel):
    username: str
    password_hash: str
