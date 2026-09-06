"""HTTP views for household chores."""

from __future__ import annotations

import json

from django.http import HttpResponseRedirect, JsonResponse
from django.shortcuts import render
from django.urls import reverse
from django.views.decorators.http import require_GET, require_POST

from chores.helpers import SESSION_MEMBER_ID_KEY, get_current_member
from chores.models import Chore, Member, RecurringTemplate
from chores.services import (
    ClaimConflictError,
    ClaimForbiddenError,
    CompleteConflictError,
    CompleteForbiddenError,
    CreateOneOffError,
    HouseholdJoinError,
    InviteCodeNotFoundError,
    ReleaseConflictError,
    ReleaseForbiddenError,
    TemplateForbiddenError,
    TemplateValidationError,
    claim_chore,
    complete_chore,
    create_household,
    create_one_off_chore,
    create_recurring_template,
    deactivate_recurring_template,
    join_household,
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
            "completed_at": (
                chore.completed_at.isoformat() if chore.completed_at else None
            ),
            "template": chore.template_id,
        },
        status=status,
    )


def _denied_response(request):
    """Render a clear denial page for missing/invalid session member."""
    return render(request, "chores/denied.html", status=401)


def _forbidden_response(request):
    """Render a clear forbidden page for non-admin members."""
    return render(request, "chores/forbidden.html", status=403)


def _redirect_to_list():
    return HttpResponseRedirect(reverse("chores:chore_list"))


def _redirect_to_admin():
    return HttpResponseRedirect(reverse("chores:admin_page"))


def _wants_json(request) -> bool:
    content_type = request.content_type or ""
    return "application/json" in content_type


def _set_session_member(request, member: Member) -> None:
    request.session[SESSION_MEMBER_ID_KEY] = member.pk


def create_household_page(request):
    """Phone-friendly create-household form; POST creates admin + session."""
    if request.method == "GET":
        return render(request, "chores/create_household.html", {"error": None})

    payload = _request_payload(request)
    try:
        household, member = create_household(
            name=payload.get("name"),
            display_name=payload.get("display_name"),
        )
    except HouseholdJoinError as exc:
        if _wants_json(request):
            return JsonResponse({"error": str(exc)}, status=400)
        return render(
            request,
            "chores/create_household.html",
            {
                "error": str(exc),
                "name": payload.get("name") or "",
                "display_name": payload.get("display_name") or "",
            },
            status=400,
        )

    _set_session_member(request, member)
    if _wants_json(request):
        return JsonResponse(
            {
                "household_id": household.pk,
                "member_id": member.pk,
                "invite_code": household.invite_code,
            },
            status=201,
        )
    return _redirect_to_list()


def join_household_page(request):
    """Phone-friendly join form; POST joins via invite code + session."""
    if request.method == "GET":
        return render(request, "chores/join_household.html", {"error": None})

    payload = _request_payload(request)
    try:
        household, member = join_household(
            invite_code=payload.get("invite_code"),
            display_name=payload.get("display_name"),
        )
    except InviteCodeNotFoundError as exc:
        if _wants_json(request):
            return JsonResponse({"error": str(exc)}, status=404)
        return render(
            request,
            "chores/join_household.html",
            {
                "error": str(exc),
                "invite_code": payload.get("invite_code") or "",
                "display_name": payload.get("display_name") or "",
            },
            status=404,
        )
    except HouseholdJoinError as exc:
        if _wants_json(request):
            return JsonResponse({"error": str(exc)}, status=400)
        return render(
            request,
            "chores/join_household.html",
            {
                "error": str(exc),
                "invite_code": payload.get("invite_code") or "",
                "display_name": payload.get("display_name") or "",
            },
            status=400,
        )

    _set_session_member(request, member)
    if _wants_json(request):
        return JsonResponse(
            {
                "household_id": household.pk,
                "member_id": member.pk,
            },
            status=201,
        )
    return _redirect_to_list()


@require_GET
def chore_list(request):
    """Phone-friendly household chore list segmented by claim state."""
    member = get_current_member(request)
    if member is None:
        return _denied_response(request)

    chores = (
        Chore.objects.filter(household_id=member.household_id)
        .exclude(status=Chore.Status.DONE)
        .select_related("claimer")
        .order_by("created_at", "id")
    )

    unclaimed = []
    mine = []
    others_claimed = []
    for chore in chores:
        if chore.status == Chore.Status.OPEN:
            unclaimed.append(chore)
        elif chore.status == Chore.Status.CLAIMED:
            if chore.claimer_id == member.pk:
                mine.append(chore)
            else:
                others_claimed.append(chore)

    return render(
        request,
        "chores/chore_list.html",
        {
            "member": member,
            "unclaimed": unclaimed,
            "mine": mine,
            "others_claimed": others_claimed,
        },
    )


@require_GET
def admin_page(request):
    """Phone-friendly admin page: invite code + recurring template management."""
    member = get_current_member(request)
    if member is None:
        return _denied_response(request)
    if member.role != Member.Role.ADMIN:
        return _forbidden_response(request)

    templates = (
        RecurringTemplate.objects.filter(household_id=member.household_id)
        .order_by("-is_active", "title", "id")
    )

    return render(
        request,
        "chores/admin.html",
        {
            "member": member,
            "templates": templates,
        },
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
def create_one_off_html(request):
    """Form-friendly one-off create; redirects back to the shared list."""
    member = get_current_member(request)
    if member is None:
        return _denied_response(request)

    title = _request_title(request)
    try:
        create_one_off_chore(member, title)
    except CreateOneOffError:
        return _redirect_to_list()

    return _redirect_to_list()


@require_POST
def claim_html(request, chore_id: int):
    """Form-friendly claim; redirects back to the shared list."""
    member = get_current_member(request)
    if member is None:
        return _denied_response(request)

    try:
        claim_chore(member, chore_id)
    except (ClaimForbiddenError, ClaimConflictError):
        return _redirect_to_list()

    return _redirect_to_list()


@require_POST
def release_html(request, chore_id: int):
    """Form-friendly release; redirects back to the shared list."""
    member = get_current_member(request)
    if member is None:
        return _denied_response(request)

    try:
        release_chore(member, chore_id)
    except (ReleaseForbiddenError, ReleaseConflictError):
        return _redirect_to_list()

    return _redirect_to_list()


@require_POST
def complete_html(request, chore_id: int):
    """Form-friendly complete; redirects back to the shared list."""
    member = get_current_member(request)
    if member is None:
        return _denied_response(request)

    try:
        complete_chore(member, chore_id)
    except (CompleteForbiddenError, CompleteConflictError):
        return _redirect_to_list()

    return _redirect_to_list()


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
def complete(request, chore_id: int):
    """Mark a claimed chore as done (claimer only; no photo/peer confirmation)."""
    member = get_current_member(request)
    if member is None:
        return JsonResponse({"error": "Authentication required."}, status=401)

    try:
        chore = complete_chore(member, chore_id)
    except CompleteForbiddenError as exc:
        return JsonResponse({"error": str(exc)}, status=403)
    except CompleteConflictError as exc:
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
def create_template_html(request):
    """Form-friendly template create; redirects back to the admin page."""
    member = get_current_member(request)
    if member is None:
        return _denied_response(request)

    payload = _request_payload(request)
    try:
        create_recurring_template(
            member,
            title=payload.get("title"),
            cadence=payload.get("cadence"),
            anchor_date=payload.get("anchor_date"),
        )
    except TemplateForbiddenError:
        return _forbidden_response(request)
    except TemplateValidationError:
        return _redirect_to_admin()

    return _redirect_to_admin()


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
def update_template_html(request, template_id: int):
    """Form-friendly template update; redirects back to the admin page."""
    member = get_current_member(request)
    if member is None:
        return _denied_response(request)

    payload = _request_payload(request)
    try:
        update_recurring_template(
            member,
            template_id,
            title=payload.get("title"),
            cadence=payload.get("cadence"),
            anchor_date=payload.get("anchor_date"),
            title_provided="title" in payload,
            cadence_provided="cadence" in payload,
            anchor_date_provided="anchor_date" in payload,
        )
    except TemplateForbiddenError:
        return _forbidden_response(request)
    except TemplateValidationError:
        return _redirect_to_admin()

    return _redirect_to_admin()


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


@require_POST
def deactivate_template_html(request, template_id: int):
    """Form-friendly template deactivate; redirects back to the admin page."""
    member = get_current_member(request)
    if member is None:
        return _denied_response(request)

    try:
        deactivate_recurring_template(member, template_id)
    except TemplateForbiddenError:
        return _forbidden_response(request)
    except TemplateValidationError:
        return _redirect_to_admin()

    return _redirect_to_admin()
