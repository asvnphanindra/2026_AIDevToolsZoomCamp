"""HTTP views for household chores."""

from __future__ import annotations

import json

from django.http import JsonResponse
from django.views.decorators.http import require_POST

from chores.helpers import get_current_member
from chores.services import (
    ClaimConflictError,
    ClaimForbiddenError,
    CreateOneOffError,
    ReleaseConflictError,
    ReleaseForbiddenError,
    TemplateForbiddenError,
    TemplateValidationError,
    claim_chore,
    create_one_off_chore,
    create_recurring_template,
    deactivate_recurring_template,
    release_chore,
    update_recurring_template,
)


def _request_payload(request) -> dict:
    """Parse JSON body or form POST into a plain dict."""
    content_type = request.content_type or ""
    if "application/json" in content_type:
        try:
            payload = json.loads(request.body.decode() or "{}")
        except (json.JSONDecodeError, UnicodeDecodeError):
            return {}
        if not isinstance(payload, dict):
            return {}
        return payload
    return request.POST.dict()


def _request_title(request):
    """Extract title from JSON body or form POST; ignore other chore fields."""
    return _request_payload(request).get("title")


def _template_response(template, *, status: int = 200) -> JsonResponse:
    return JsonResponse(
        {
            "id": template.id,
            "title": template.title,
            "cadence": template.cadence,
            "anchor_date": template.anchor_date.isoformat(),
            "is_active": template.is_active,
            "household_id": template.household_id,
        },
        status=status,
    )


def _chore_response(chore, *, status: int = 200) -> JsonResponse:
    return JsonResponse(
        {
            "id": chore.id,
            "title": chore.title,
            "status": chore.status,
            "household_id": chore.household_id,
            "claimer": chore.claimer_id,
            "claimed_at": chore.claimed_at.isoformat() if chore.claimed_at else None,
            "template": chore.template_id,
        },
        status=status,
    )


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


@require_POST
def claim(request, chore_id: int):
    """Claim an open chore for the session member's household."""
    member = get_current_member(request)
    if member is None:
        return JsonResponse({"error": "Authentication required."}, status=401)

    try:
        chore = claim_chore(member, chore_id)
    except ClaimForbiddenError as exc:
        return JsonResponse({"error": str(exc)}, status=403)
    except ClaimConflictError as exc:
        return JsonResponse({"error": str(exc)}, status=409)

    return _chore_response(chore)


@require_POST
def release(request, chore_id: int):
    """Release a claimed chore back to open (claimer only)."""
    member = get_current_member(request)
    if member is None:
        return JsonResponse({"error": "Authentication required."}, status=401)

    try:
        chore = release_chore(member, chore_id)
    except ReleaseForbiddenError as exc:
        return JsonResponse({"error": str(exc)}, status=403)
    except ReleaseConflictError as exc:
        return JsonResponse({"error": str(exc)}, status=409)

    return _chore_response(chore)


@require_POST
def create_template(request):
    """Create a recurring template for the session admin's household."""
    member = get_current_member(request)
    if member is None:
        return JsonResponse({"error": "Authentication required."}, status=401)

    payload = _request_payload(request)
    try:
        template = create_recurring_template(
            member,
            title=payload.get("title"),
            cadence=payload.get("cadence"),
            anchor_date=payload.get("anchor_date"),
        )
    except TemplateForbiddenError as exc:
        return JsonResponse({"error": str(exc)}, status=403)
    except TemplateValidationError as exc:
        return JsonResponse({"error": str(exc)}, status=400)

    return _template_response(template, status=201)


@require_POST
def update_template(request, template_id: int):
    """Update a recurring template belonging to the session admin's household."""
    member = get_current_member(request)
    if member is None:
        return JsonResponse({"error": "Authentication required."}, status=401)

    payload = _request_payload(request)
    try:
        template = update_recurring_template(
            member,
            template_id,
            title=payload.get("title"),
            cadence=payload.get("cadence"),
            anchor_date=payload.get("anchor_date"),
            title_provided="title" in payload,
            cadence_provided="cadence" in payload,
            anchor_date_provided="anchor_date" in payload,
        )
    except TemplateForbiddenError as exc:
        return JsonResponse({"error": str(exc)}, status=403)
    except TemplateValidationError as exc:
        return JsonResponse({"error": str(exc)}, status=400)

    return _template_response(template)


@require_POST
def deactivate_template(request, template_id: int):
    """Deactivate a recurring template belonging to the session admin's household."""
    member = get_current_member(request)
    if member is None:
        return JsonResponse({"error": "Authentication required."}, status=401)

    try:
        template = deactivate_recurring_template(member, template_id)
    except TemplateForbiddenError as exc:
        return JsonResponse({"error": str(exc)}, status=403)
    except TemplateValidationError as exc:
        return JsonResponse({"error": str(exc)}, status=400)

    return _template_response(template)
