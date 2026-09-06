"""Request/session helpers for household member identity."""

from __future__ import annotations

from chores.models import Member

SESSION_MEMBER_ID_KEY = "member_id"


def get_current_member(request) -> Member | None:
    """Resolve session ``member_id`` to a Member, or None if unauthenticated."""
    member_id = request.session.get(SESSION_MEMBER_ID_KEY)
    if member_id is None:
        return None
    try:
        return Member.objects.get(pk=member_id)
    except (Member.DoesNotExist, TypeError, ValueError):
        return None
