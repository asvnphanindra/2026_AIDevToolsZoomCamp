"""HTTP views for household chores."""

from __future__ import annotations

import json

from django.http import JsonResponse
from django.views.decorators.http import require_POST

from chores.helpers import get_current_member
from chores.services import CreateOneOffError, create_one_off_chore


def _request_title(request):
    """Extract title from JSON body or form POST; ignore other chore fields."""
    content_type = request.content_type or ""
    if "application/json" in content_type:
        try:
            payload = json.loads(request.body.decode() or "{}")
        except (json.JSONDecodeError, UnicodeDecodeError):
            return None
        if not isinstance(payload, dict):
            return None
        return payload.get("title")
    return request.POST.get("title")


@require_POST
def create_one_off(request):
    """Create a one-off open chore for the session member's household."""
    member = get_current_member(request)
    if member is None:
        return JsonResponse({"error": "Authentication required."}, status=401)

    title = _request_title(request)
    try:
        chore = create_one_off_chore(member, title)
    except CreateOneOffError as exc:
        return JsonResponse({"error": str(exc)}, status=400)

    return JsonResponse(
        {
            "id": chore.id,
            "title": chore.title,
            "status": chore.status,
            "household_id": chore.household_id,
            "claimer": chore.claimer_id,
            "template": chore.template_id,
        },
        status=201,
    )
