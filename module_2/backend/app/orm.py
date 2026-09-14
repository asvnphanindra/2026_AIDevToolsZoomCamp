from __future__ import annotations

from datetime import date

from sqlalchemy import Date, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class UserRow(Base):
    __tablename__ = "users"

    username: Mapped[str] = mapped_column(String(64), primary_key=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    tokens: Mapped[list[TokenRow]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class TokenRow(Base):
    __tablename__ = "tokens"

    token: Mapped[str] = mapped_column(String(128), primary_key=True)
    username: Mapped[str] = mapped_column(
        ForeignKey("users.username", ondelete="CASCADE"), nullable=False, index=True
    )

    user: Mapped[UserRow] = relationship(back_populates="tokens")


class ProjectRow(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    color_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    cards: Mapped[list[CardRow]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )


class CardRow(Base):
    __tablename__ = "cards"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    project_id: Mapped[str] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="todo")
    slot_day: Mapped[int | None] = mapped_column(Integer, nullable=True)
    slot_hour: Mapped[int | None] = mapped_column(Integer, nullable=True)

    project: Mapped[ProjectRow] = relationship(back_populates="cards")


class SettingsRow(Base):
    """Singleton settings row (id is always 1)."""

    __tablename__ = "settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    monday_date: Mapped[date | None] = mapped_column(Date, nullable=True)
