"""Domain services for chore operations."""

from __future__ import annotations

from datetime import date, datetime

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
