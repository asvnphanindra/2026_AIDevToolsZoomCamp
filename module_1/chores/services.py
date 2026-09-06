"""Domain services for chore operations."""

from __future__ import annotations

from chores.models import Chore, Member

CHORE_TITLE_MAX_LENGTH = Chore._meta.get_field("title").max_length


class CreateOneOffError(Exception):
    """Raised when a one-off chore cannot be created due to invalid input."""


def create_one_off_chore(member: Member, title: str | None) -> Chore:
    """Create an open one-off chore for the member's household.

    Household, status, claimer, and template are always set by the server from
    the acting member — never from client-supplied values.
    """
    if title is None:
        raise CreateOneOffError("Title is required.")
    stripped = title.strip() if isinstance(title, str) else str(title).strip()
    if not stripped:
        raise CreateOneOffError("Title must be non-empty.")
    if len(stripped) > CHORE_TITLE_MAX_LENGTH:
        raise CreateOneOffError(
            f"Title must be at most {CHORE_TITLE_MAX_LENGTH} characters."
        )

    return Chore.objects.create(
        household_id=member.household_id,
        title=stripped,
        status=Chore.Status.OPEN,
        claimer=None,
        template=None,
    )
