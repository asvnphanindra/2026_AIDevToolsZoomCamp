"""Tests for spawning open chores from recurring templates (issue #12)."""

from datetime import date, timedelta

import pytest
from django.core.management import call_command
from django.utils import timezone

from chores.models import Chore, Household, Member, RecurringTemplate
from chores.recurrence import is_due, period_key
from chores.services import spawn_recurring_chores


@pytest.fixture
def household(db):
    household = Household.objects.create(name="Spawn House")
    Member.objects.create(
        household=household,
        display_name="Admin",
        role=Member.Role.ADMIN,
    )
    return household


@pytest.mark.django_db
def test_due_daily_template_spawns_once(household):
    as_of = date(2026, 9, 6)
    template = RecurringTemplate.objects.create(
        household=household,
        title="Wipe counters",
        cadence=RecurringTemplate.Cadence.DAILY,
        anchor_date=date(2026, 9, 1),
        is_active=True,
    )

    created = spawn_recurring_chores(as_of=as_of)

    assert len(created) == 1
    chore = created[0]
    assert chore.title == "Wipe counters"
    assert chore.status == Chore.Status.OPEN
    assert chore.claimer_id is None
    assert chore.household_id == household.pk
    assert chore.template_id == template.pk
    assert chore.period_key == "2026-09-06"
    assert Chore.objects.filter(template=template).count() == 1


@pytest.mark.django_db
def test_second_run_same_period_does_not_duplicate(household):
    as_of = date(2026, 9, 6)
    RecurringTemplate.objects.create(
        household=household,
        title="Wipe counters",
        cadence=RecurringTemplate.Cadence.DAILY,
        anchor_date=date(2026, 9, 1),
        is_active=True,
    )

    first = spawn_recurring_chores(as_of=as_of)
    second = spawn_recurring_chores(as_of=as_of)

    assert len(first) == 1
    assert first[0].period_key == "2026-09-06"
    assert second == []
    assert Chore.objects.filter(status=Chore.Status.OPEN).count() == 1


@pytest.mark.django_db
def test_incomplete_prior_period_does_not_block_new_period(household):
    """Open chore from day 1 must not block day-2 spawn for a daily template."""
    template = RecurringTemplate.objects.create(
        household=household,
        title="Wipe counters",
        cadence=RecurringTemplate.Cadence.DAILY,
        anchor_date=date(2026, 9, 1),
        is_active=True,
    )

    day1 = spawn_recurring_chores(as_of=date(2026, 9, 6))
    day2 = spawn_recurring_chores(as_of=date(2026, 9, 7))

    assert len(day1) == 1
    assert day1[0].period_key == "2026-09-06"
    assert day1[0].status == Chore.Status.OPEN
    assert len(day2) == 1
    assert day2[0].period_key == "2026-09-07"
    assert day2[0].status == Chore.Status.OPEN
    assert Chore.objects.filter(template=template, status=Chore.Status.OPEN).count() == 2
    # Same-period re-run still dedups
    assert spawn_recurring_chores(as_of=date(2026, 9, 7)) == []
    assert Chore.objects.filter(template=template).count() == 2


@pytest.mark.django_db
def test_weekly_due_and_not_due_behavior(household):
    anchor = date(2026, 9, 1)  # Tuesday
    template = RecurringTemplate.objects.create(
        household=household,
        title="Take out trash",
        cadence=RecurringTemplate.Cadence.WEEKLY,
        anchor_date=anchor,
        is_active=True,
    )

    due_day = date(2026, 9, 8)  # +7 days
    not_due_day = date(2026, 9, 9)  # +8 days

    assert is_due("weekly", anchor, due_day) is True
    assert is_due("weekly", anchor, not_due_day) is False

    assert spawn_recurring_chores(as_of=not_due_day) == []
    assert Chore.objects.filter(template=template).count() == 0

    created = spawn_recurring_chores(as_of=due_day)
    assert len(created) == 1
    assert created[0].template_id == template.pk
    assert created[0].period_key == "2026-09-08"


@pytest.mark.django_db
def test_inactive_template_does_not_spawn(household):
    as_of = date(2026, 9, 6)
    RecurringTemplate.objects.create(
        household=household,
        title="Retired chore",
        cadence=RecurringTemplate.Cadence.DAILY,
        anchor_date=date(2026, 9, 1),
        is_active=False,
    )

    assert spawn_recurring_chores(as_of=as_of) == []
    assert Chore.objects.count() == 0


@pytest.mark.django_db
def test_not_yet_due_relative_to_anchor_does_not_spawn(household):
    as_of = date(2026, 9, 5)
    RecurringTemplate.objects.create(
        household=household,
        title="Future daily",
        cadence=RecurringTemplate.Cadence.DAILY,
        anchor_date=date(2026, 9, 10),
        is_active=True,
    )
    RecurringTemplate.objects.create(
        household=household,
        title="Future weekly",
        cadence=RecurringTemplate.Cadence.WEEKLY,
        anchor_date=date(2026, 9, 10),
        is_active=True,
    )

    assert spawn_recurring_chores(as_of=as_of) == []
    assert Chore.objects.count() == 0


@pytest.mark.django_db
def test_claimed_incomplete_blocks_spawn_for_period(household):
    as_of = date(2026, 9, 6)
    template = RecurringTemplate.objects.create(
        household=household,
        title="Vacuum",
        cadence=RecurringTemplate.Cadence.DAILY,
        anchor_date=date(2026, 9, 1),
        is_active=True,
    )
    claimer = Member.objects.get(household=household)
    Chore.objects.create(
        household=household,
        title=template.title,
        status=Chore.Status.CLAIMED,
        claimer=claimer,
        template=template,
        period_key="2026-09-06",
        claimed_at=timezone.now(),
    )

    assert spawn_recurring_chores(as_of=as_of) == []
    assert Chore.objects.filter(template=template).count() == 1


@pytest.mark.django_db
def test_management_command_as_of_spawns(household):
    RecurringTemplate.objects.create(
        household=household,
        title="Command spawn",
        cadence=RecurringTemplate.Cadence.DAILY,
        anchor_date=date(2026, 9, 1),
        is_active=True,
    )

    call_command("spawn_recurring_chores", "--as-of", "2026-09-06")

    chore = Chore.objects.get()
    assert chore.title == "Command spawn"
    assert chore.status == Chore.Status.OPEN
    assert chore.template_id is not None
    assert chore.period_key == "2026-09-06"


def test_period_key_daily_and_weekly():
    anchor = date(2026, 9, 1)
    assert period_key("daily", anchor, date(2026, 9, 6)) == "2026-09-06"
    assert period_key("weekly", anchor, date(2026, 9, 1)) == "2026-09-01"
    assert period_key("weekly", anchor, date(2026, 9, 7)) == "2026-09-01"
    assert period_key("weekly", anchor, date(2026, 9, 8)) == "2026-09-08"


def test_is_due_daily_and_weekly_edges():
    anchor = date(2026, 9, 1)
    assert is_due("daily", anchor, date(2026, 8, 31)) is False
    assert is_due("daily", anchor, date(2026, 9, 1)) is True
    assert is_due("weekly", anchor, date(2026, 9, 1)) is True
    assert is_due("weekly", anchor, date(2026, 9, 2)) is False
    assert is_due("weekly", anchor, anchor + timedelta(days=14)) is True
