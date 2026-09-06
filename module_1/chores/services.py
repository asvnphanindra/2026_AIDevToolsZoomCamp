"""Domain services for chore operations."""

from __future__ import annotations

import secrets
from datetime import date, datetime

from django.db import IntegrityError, transaction
from django.utils import timezone

from chores.models import Chore, Household, Member, RecurringTemplate
from chores.recurrence import is_due

CHORE_TITLE_MAX_LENGTH = Chore._meta.get_field("title").max_length
TEMPLATE_TITLE_MAX_LENGTH = RecurringTemplate._meta.get_field("title").max_length
HOUSEHOLD_NAME_MAX_LENGTH = Household._meta.get_field("name").max_length
DISPLAY_NAME_MAX_LENGTH = Member._meta.get_field("display_name").max_length
VALID_CADENCES = frozenset(RecurringTemplate.Cadence.values)
INVITE_CODE_BYTES = 9


class CreateOneOffError(Exception):
    """Raised when a one-off chore cannot be created due to invalid input."""


class HouseholdJoinError(Exception):
    """Raised when household create/join input is invalid or conflicts."""


class InviteCodeNotFoundError(Exception):
    """Raised when an invite code does not match any household."""


class TemplateValidationError(Exception):
    """Raised when template create/update input is invalid."""


class TemplateForbiddenError(Exception):
    """Raised when a non-admin or cross-household template action is denied."""


class ClaimConflictError(Exception):
    """Raised when a chore cannot be claimed because it is not open."""


class ClaimForbiddenError(Exception):
    """Raised when a claim targets a chore outside the member's household."""


class ReleaseConflictError(Exception):
    """Raised when a chore cannot be released because it is not claimed."""


class ReleaseForbiddenError(Exception):
    """Raised when release is denied (not claimer or wrong household)."""


class CompleteConflictError(Exception):
    """Raised when a chore cannot be completed because it is not claimed."""


class CompleteForbiddenError(Exception):
    """Raised when complete is denied (not claimer or wrong household)."""


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


def _strip_required(value, *, field_label: str, max_length: int) -> str:
    if value is None:
        raise HouseholdJoinError(f"{field_label} is required.")
    stripped = value.strip() if isinstance(value, str) else str(value).strip()
    if not stripped:
        raise HouseholdJoinError(f"{field_label} must be non-empty.")
    if len(stripped) > max_length:
        raise HouseholdJoinError(
            f"{field_label} must be at most {max_length} characters."
        )
    return stripped


def _generate_unique_invite_code() -> str:
    """Return a URL-safe invite code that is unique among existing households."""
    for _ in range(20):
        code = secrets.token_urlsafe(INVITE_CODE_BYTES)
        if not code:
            continue
        if not Household.objects.filter(invite_code=code).exists():
            return code
    raise HouseholdJoinError("Could not generate a unique invite code.")


def create_household(*, name, display_name) -> tuple[Household, Member]:
    """Create a household with a unique invite code and first admin member."""
    household_name = _strip_required(
        name, field_label="Household name", max_length=HOUSEHOLD_NAME_MAX_LENGTH
    )
    member_name = _strip_required(
        display_name,
        field_label="Display name",
        max_length=DISPLAY_NAME_MAX_LENGTH,
    )

    try:
        with transaction.atomic():
            household = Household.objects.create(
                name=household_name,
                invite_code=_generate_unique_invite_code(),
            )
            member = Member.objects.create(
                household=household,
                display_name=member_name,
                role=Member.Role.ADMIN,
            )
    except IntegrityError as exc:
        raise HouseholdJoinError(
            "Display name is already taken in this household."
        ) from exc

    return household, member


def join_household(*, invite_code, display_name) -> tuple[Household, Member]:
    """Join an existing household by invite code as a regular member."""
    if invite_code is None:
        raise HouseholdJoinError("Invite code is required.")
    code = (
        invite_code.strip()
        if isinstance(invite_code, str)
        else str(invite_code).strip()
    )
    if not code:
        raise HouseholdJoinError("Invite code must be non-empty.")

    member_name = _strip_required(
        display_name,
        field_label="Display name",
        max_length=DISPLAY_NAME_MAX_LENGTH,
    )

    try:
        household = Household.objects.get(invite_code=code)
    except Household.DoesNotExist as exc:
        raise InviteCodeNotFoundError("Invite code not found.") from exc

    try:
        with transaction.atomic():
            member = Member.objects.create(
                household=household,
                display_name=member_name,
                role=Member.Role.MEMBER,
            )
    except IntegrityError as exc:
        raise HouseholdJoinError(
            "Display name is already taken in this household."
        ) from exc

    return household, member


def _require_admin(member: Member) -> None:
    if member.role != Member.Role.ADMIN:
        raise TemplateForbiddenError("Admin role required.")


def _normalize_title(title: str | None, *, required: bool) -> str | None:
    if title is None:
        if required:
            raise TemplateValidationError("Title is required.")
        return None
    stripped = title.strip() if isinstance(title, str) else str(title).strip()
    if not stripped:
        raise TemplateValidationError("Title must be non-empty.")
    if len(stripped) > TEMPLATE_TITLE_MAX_LENGTH:
        raise TemplateValidationError(
            f"Title must be at most {TEMPLATE_TITLE_MAX_LENGTH} characters."
        )
    return stripped


def _normalize_cadence(cadence: str | None, *, required: bool) -> str | None:
    if cadence is None:
        if required:
            raise TemplateValidationError("Cadence is required.")
        return None
    value = cadence.strip() if isinstance(cadence, str) else str(cadence).strip()
    if value not in VALID_CADENCES:
        raise TemplateValidationError("Cadence must be 'daily' or 'weekly'.")
    return value


def _normalize_anchor_date(anchor_date, *, required: bool) -> date | None:
    if anchor_date is None or anchor_date == "":
        if required:
            raise TemplateValidationError("Anchor date is required.")
        return None
    if isinstance(anchor_date, date) and not isinstance(anchor_date, datetime):
        return anchor_date
    if isinstance(anchor_date, datetime):
        return anchor_date.date()
    if isinstance(anchor_date, str):
        try:
            return date.fromisoformat(anchor_date.strip())
        except ValueError as exc:
            raise TemplateValidationError("Anchor date must be a valid ISO date.") from exc
    raise TemplateValidationError("Anchor date must be a valid ISO date.")


def _get_household_template(
    member: Member, template_id: int
) -> RecurringTemplate:
    try:
        template = RecurringTemplate.objects.get(pk=template_id)
    except (RecurringTemplate.DoesNotExist, TypeError, ValueError) as exc:
        raise TemplateForbiddenError(
            "Template not found in this household."
        ) from exc
    if template.household_id != member.household_id:
        raise TemplateForbiddenError("Template not found in this household.")
    return template


def create_recurring_template(
    member: Member,
    *,
    title: str | None,
    cadence: str | None,
    anchor_date,
) -> RecurringTemplate:
    """Create an active recurring template for the admin's household."""
    _require_admin(member)
    normalized_title = _normalize_title(title, required=True)
    normalized_cadence = _normalize_cadence(cadence, required=True)
    normalized_anchor = _normalize_anchor_date(anchor_date, required=True)

    return RecurringTemplate.objects.create(
        household_id=member.household_id,
        title=normalized_title,
        cadence=normalized_cadence,
        anchor_date=normalized_anchor,
        is_active=True,
    )


def update_recurring_template(
    member: Member,
    template_id: int,
    *,
    title: str | None = None,
    cadence: str | None = None,
    anchor_date=None,
    title_provided: bool = False,
    cadence_provided: bool = False,
    anchor_date_provided: bool = False,
) -> RecurringTemplate:
    """Update title/cadence/anchor_date on a household template (admin only)."""
    _require_admin(member)
    template = _get_household_template(member, template_id)

    if not (title_provided or cadence_provided or anchor_date_provided):
        raise TemplateValidationError(
            "At least one of title, cadence, or anchor_date is required."
        )

    if title_provided:
        template.title = _normalize_title(title, required=True)
    if cadence_provided:
        template.cadence = _normalize_cadence(cadence, required=True)
    if anchor_date_provided:
        template.anchor_date = _normalize_anchor_date(anchor_date, required=True)

    template.save()
    return template


def deactivate_recurring_template(
    member: Member, template_id: int
) -> RecurringTemplate:
    """Deactivate a household template by setting is_active=False (admin only)."""
    _require_admin(member)
    template = _get_household_template(member, template_id)
    template.is_active = False
    template.save(update_fields=["is_active"])
    return template


def _get_household_chore(
    member: Member,
    chore_id: int,
    *,
    forbidden_error: type[Exception] = ClaimForbiddenError,
) -> Chore:
    try:
        chore = Chore.objects.get(pk=chore_id)
    except (Chore.DoesNotExist, TypeError, ValueError) as exc:
        raise forbidden_error("Chore not found in this household.") from exc
    if chore.household_id != member.household_id:
        raise forbidden_error("Chore not found in this household.")
    return chore


def claim_chore(member: Member, chore_id: int) -> Chore:
    """Claim an open chore for the acting member (admin or member role).

    Uses a conditional update on ``status=open`` so concurrent claims cannot
    both succeed — exactly one claimer wins.
    """
    chore = _get_household_chore(member, chore_id)

    if chore.status != Chore.Status.OPEN:
        raise ClaimConflictError("Chore is not open and cannot be claimed.")

    claimed_at = timezone.now()
    updated = (
        Chore.objects.filter(
            pk=chore.pk,
            status=Chore.Status.OPEN,
            household_id=member.household_id,
        ).update(
            status=Chore.Status.CLAIMED,
            claimer_id=member.pk,
            claimed_at=claimed_at,
        )
    )
    if updated != 1:
        raise ClaimConflictError("Chore is not open and cannot be claimed.")

    chore.refresh_from_db()
    return chore


def release_chore(member: Member, chore_id: int) -> Chore:
    """Release a claimed chore back to open (claimer only; no admin override).

    Uses a conditional update on ``status=claimed`` and ``claimer`` so a
    concurrent release or status change cannot leave inconsistent state.
    """
    chore = _get_household_chore(
        member, chore_id, forbidden_error=ReleaseForbiddenError
    )

    if chore.status != Chore.Status.CLAIMED:
        raise ReleaseConflictError("Chore is not claimed and cannot be released.")

    if chore.claimer_id != member.pk:
        raise ReleaseForbiddenError("Only the claimer can release this chore.")

    updated = (
        Chore.objects.filter(
            pk=chore.pk,
            status=Chore.Status.CLAIMED,
            claimer_id=member.pk,
            household_id=member.household_id,
        ).update(
            status=Chore.Status.OPEN,
            claimer_id=None,
            claimed_at=None,
        )
    )
    if updated != 1:
        raise ReleaseConflictError("Chore is not claimed and cannot be released.")

    chore.refresh_from_db()
    return chore


def complete_chore(member: Member, chore_id: int) -> Chore:
    """Mark a claimed chore as done (claimer only; no photo/peer confirmation).

    Keeps the claimer on the row for history. Uses a conditional update on
    ``status=claimed`` and ``claimer`` so concurrent changes cannot leave
    inconsistent state.
    """
    chore = _get_household_chore(
        member, chore_id, forbidden_error=CompleteForbiddenError
    )

    if chore.status != Chore.Status.CLAIMED:
        raise CompleteConflictError("Chore is not claimed and cannot be completed.")

    if chore.claimer_id != member.pk:
        raise CompleteForbiddenError("Only the claimer can complete this chore.")

    completed_at = timezone.now()
    updated = (
        Chore.objects.filter(
            pk=chore.pk,
            status=Chore.Status.CLAIMED,
            claimer_id=member.pk,
            household_id=member.household_id,
        ).update(
            status=Chore.Status.DONE,
            completed_at=completed_at,
        )
    )
    if updated != 1:
        raise CompleteConflictError("Chore is not claimed and cannot be completed.")

    chore.refresh_from_db()
    return chore


def _has_incomplete_for_template(template: RecurringTemplate) -> bool:
    """True if an open or claimed chore already exists for this template.

    An outstanding incomplete instance is treated as covering the current
    period, so spawn will not create another until it is completed.
    """
    return Chore.objects.filter(
        template_id=template.pk,
        status__in=[Chore.Status.OPEN, Chore.Status.CLAIMED],
    ).exists()


def spawn_recurring_chores(*, as_of: date | None = None) -> list[Chore]:
    """Spawn open chores for active templates that are due on ``as_of``.

    Defaults ``as_of`` to today (local date). Skips inactive templates and
    templates that already have an incomplete (open/claimed) chore. Period
    and due rules: see ``chores.recurrence``.
    """
    if as_of is None:
        as_of = timezone.localdate()

    created: list[Chore] = []
    templates = RecurringTemplate.objects.filter(is_active=True).select_related(
        "household"
    )
    for template in templates:
        if not is_due(template.cadence, template.anchor_date, as_of):
            continue
        if _has_incomplete_for_template(template):
            continue
        chore = Chore.objects.create(
            household_id=template.household_id,
            title=template.title,
            status=Chore.Status.OPEN,
            claimer=None,
            template=template,
        )
        created.append(chore)
    return created
