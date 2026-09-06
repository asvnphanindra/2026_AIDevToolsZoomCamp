"""Domain services for chore operations."""

from __future__ import annotations

from datetime import date, datetime

from django.utils import timezone

from chores.models import Chore, Member, RecurringTemplate

CHORE_TITLE_MAX_LENGTH = Chore._meta.get_field("title").max_length
TEMPLATE_TITLE_MAX_LENGTH = RecurringTemplate._meta.get_field("title").max_length
VALID_CADENCES = frozenset(RecurringTemplate.Cadence.values)


class CreateOneOffError(Exception):
    """Raised when a one-off chore cannot be created due to invalid input."""


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
