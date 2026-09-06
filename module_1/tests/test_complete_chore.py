"""Tests for self-marking a claimed chore complete (issue #7)."""

import pytest
from django.test import Client
from django.utils import timezone

from chores.models import Chore, Household, Member


def _session_member(client: Client, member: Member) -> None:
    session = client.session
    session["member_id"] = member.pk
    session.save()


def _claim_chore(chore: Chore, claimer: Member):
    claimed_at = timezone.now()
    chore.status = Chore.Status.CLAIMED
    chore.claimer = claimer
    chore.claimed_at = claimed_at
    chore.save()
    return claimed_at


@pytest.fixture
def two_households(db):
    household_a = Household.objects.create(name="Household A")
    household_b = Household.objects.create(name="Household B")
    admin_a = Member.objects.create(
        household=household_a,
        display_name="Admin A",
        role=Member.Role.ADMIN,
    )
    member_a = Member.objects.create(
        household=household_a,
        display_name="Member A",
        role=Member.Role.MEMBER,
    )
    member_a2 = Member.objects.create(
        household=household_a,
        display_name="Member A2",
        role=Member.Role.MEMBER,
    )
    member_b = Member.objects.create(
        household=household_b,
        display_name="Member B",
        role=Member.Role.MEMBER,
    )
    open_chore_a = Chore.objects.create(
        household=household_a,
        title="Sweep porch",
        status=Chore.Status.OPEN,
    )
    claimed_chore_b = Chore.objects.create(
        household=household_b,
        title="Mow lawn",
        status=Chore.Status.OPEN,
    )
    return {
        "household_a": household_a,
        "household_b": household_b,
        "admin_a": admin_a,
        "member_a": member_a,
        "member_a2": member_a2,
        "member_b": member_b,
        "open_chore_a": open_chore_a,
        "claimed_chore_b": claimed_chore_b,
    }


@pytest.mark.django_db
def test_claimer_completes_successfully(two_households):
    client = Client()
    member = two_households["member_a"]
    chore = two_households["open_chore_a"]
    claimed_at = _claim_chore(chore, member)
    _session_member(client, member)

    response = client.post(f"/chores/{chore.pk}/complete/")

    assert response.status_code == 200
    data = response.json()
    chore.refresh_from_db()
    assert chore.status == Chore.Status.DONE
    assert chore.claimer_id == member.pk
    assert chore.claimed_at == claimed_at
    assert chore.completed_at is not None
    assert data["status"] == "done"
    assert data["claimer"] == member.pk
    assert data["completed_at"] is not None


@pytest.mark.django_db
def test_other_member_cannot_complete(two_households):
    client = Client()
    claimer = two_households["member_a"]
    other = two_households["member_a2"]
    chore = two_households["open_chore_a"]
    claimed_at = _claim_chore(chore, claimer)
    _session_member(client, other)

    response = client.post(f"/chores/{chore.pk}/complete/")

    assert response.status_code == 403
    chore.refresh_from_db()
    assert chore.status == Chore.Status.CLAIMED
    assert chore.claimer_id == claimer.pk
    assert chore.claimed_at == claimed_at
    assert chore.completed_at is None


@pytest.mark.django_db
def test_admin_not_claimer_cannot_complete(two_households):
    client = Client()
    claimer = two_households["member_a"]
    admin = two_households["admin_a"]
    chore = two_households["open_chore_a"]
    claimed_at = _claim_chore(chore, claimer)
    _session_member(client, admin)

    response = client.post(f"/chores/{chore.pk}/complete/")

    assert response.status_code == 403
    chore.refresh_from_db()
    assert chore.status == Chore.Status.CLAIMED
    assert chore.claimer_id == claimer.pk
    assert chore.claimed_at == claimed_at
    assert chore.completed_at is None


@pytest.mark.django_db
def test_complete_open_chore_rejected(two_households):
    client = Client()
    member = two_households["member_a"]
    chore = two_households["open_chore_a"]
    _session_member(client, member)

    response = client.post(f"/chores/{chore.pk}/complete/")

    assert response.status_code == 409
    chore.refresh_from_db()
    assert chore.status == Chore.Status.OPEN
    assert chore.claimer_id is None
    assert chore.completed_at is None


@pytest.mark.django_db
def test_complete_done_chore_rejected(two_households):
    client = Client()
    member = two_households["member_a"]
    chore = two_households["open_chore_a"]
    claimed_at = timezone.now()
    completed_at = timezone.now()
    chore.status = Chore.Status.DONE
    chore.claimer = member
    chore.claimed_at = claimed_at
    chore.completed_at = completed_at
    chore.save()
    _session_member(client, member)

    response = client.post(f"/chores/{chore.pk}/complete/")

    assert response.status_code == 409
    chore.refresh_from_db()
    assert chore.status == Chore.Status.DONE
    assert chore.claimer_id == member.pk
    assert chore.claimed_at == claimed_at
    assert chore.completed_at == completed_at


@pytest.mark.django_db
def test_done_chore_not_claimable(two_households):
    client = Client()
    member = two_households["member_a"]
    other = two_households["member_a2"]
    chore = two_households["open_chore_a"]
    claimed_at = _claim_chore(chore, member)
    _session_member(client, member)

    complete_response = client.post(f"/chores/{chore.pk}/complete/")
    assert complete_response.status_code == 200

    _session_member(client, other)
    claim_response = client.post(f"/chores/{chore.pk}/claim/")

    assert claim_response.status_code == 409
    chore.refresh_from_db()
    assert chore.status == Chore.Status.DONE
    assert chore.claimer_id == member.pk
    assert chore.claimed_at == claimed_at
    assert chore.completed_at is not None


@pytest.mark.django_db
def test_cross_household_complete_forbidden(two_households):
    client = Client()
    member_a = two_households["member_a"]
    member_b = two_households["member_b"]
    chore_b = two_households["claimed_chore_b"]
    claimed_at = _claim_chore(chore_b, member_b)
    _session_member(client, member_a)

    response = client.post(f"/chores/{chore_b.pk}/complete/")

    assert response.status_code == 403
    chore_b.refresh_from_db()
    assert chore_b.status == Chore.Status.CLAIMED
    assert chore_b.claimer_id == member_b.pk
    assert chore_b.claimed_at == claimed_at
    assert chore_b.completed_at is None


@pytest.mark.django_db
def test_unauthenticated_complete_denied(two_households):
    client = Client()
    claimer = two_households["member_a"]
    chore = two_households["open_chore_a"]
    claimed_at = _claim_chore(chore, claimer)

    response = client.post(f"/chores/{chore.pk}/complete/")

    assert response.status_code == 401
    chore.refresh_from_db()
    assert chore.status == Chore.Status.CLAIMED
    assert chore.claimer_id == claimer.pk
    assert chore.claimed_at == claimed_at
    assert chore.completed_at is None


@pytest.mark.django_db
def test_invalid_member_id_in_session_denied(two_households):
    client = Client()
    claimer = two_households["member_a"]
    chore = two_households["open_chore_a"]
    claimed_at = _claim_chore(chore, claimer)
    session = client.session
    session["member_id"] = 999_999
    session.save()

    response = client.post(f"/chores/{chore.pk}/complete/")

    assert response.status_code == 401
    chore.refresh_from_db()
    assert chore.status == Chore.Status.CLAIMED
    assert chore.claimer_id == claimer.pk
    assert chore.claimed_at == claimed_at
    assert chore.completed_at is None
