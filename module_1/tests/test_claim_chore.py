"""Tests for claiming an open chore (issue #5)."""

import pytest
from django.test import Client
from django.utils import timezone

from chores.models import Chore, Household, Member
from chores.services import ClaimConflictError, claim_chore


def _session_member(client: Client, member: Member) -> None:
    session = client.session
    session["member_id"] = member.pk
    session.save()


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
    open_chore_b = Chore.objects.create(
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
        "open_chore_b": open_chore_b,
    }


@pytest.mark.django_db
def test_member_claims_open_chore_successfully(two_households):
    client = Client()
    member = two_households["member_a"]
    chore = two_households["open_chore_a"]
    _session_member(client, member)

    response = client.post(f"/chores/{chore.pk}/claim/")

    assert response.status_code == 200
    data = response.json()
    chore.refresh_from_db()
    assert chore.status == Chore.Status.CLAIMED
    assert chore.claimer_id == member.pk
    assert chore.claimed_at is not None
    assert data["status"] == "claimed"
    assert data["claimer"] == member.pk
    assert data["claimed_at"] is not None


@pytest.mark.django_db
def test_admin_claims_open_chore_successfully(two_households):
    client = Client()
    admin = two_households["admin_a"]
    chore = two_households["open_chore_a"]
    _session_member(client, admin)

    response = client.post(f"/chores/{chore.pk}/claim/")

    assert response.status_code == 200
    chore.refresh_from_db()
    assert chore.status == Chore.Status.CLAIMED
    assert chore.claimer_id == admin.pk
    assert chore.claimed_at is not None


@pytest.mark.django_db
def test_claim_already_claimed_rejected(two_households):
    client = Client()
    member = two_households["member_a"]
    other = two_households["member_a2"]
    chore = two_households["open_chore_a"]
    claimed_at = timezone.now()
    chore.status = Chore.Status.CLAIMED
    chore.claimer = other
    chore.claimed_at = claimed_at
    chore.save()
    _session_member(client, member)

    response = client.post(f"/chores/{chore.pk}/claim/")

    assert response.status_code == 409
    chore.refresh_from_db()
    assert chore.status == Chore.Status.CLAIMED
    assert chore.claimer_id == other.pk
    assert chore.claimed_at == claimed_at


@pytest.mark.django_db
def test_claim_done_chore_rejected(two_households):
    client = Client()
    member = two_households["member_a"]
    chore = two_households["open_chore_a"]
    chore.status = Chore.Status.DONE
    chore.claimer = member
    chore.claimed_at = timezone.now()
    chore.completed_at = timezone.now()
    chore.save()
    _session_member(client, member)

    response = client.post(f"/chores/{chore.pk}/claim/")

    assert response.status_code == 409
    chore.refresh_from_db()
    assert chore.status == Chore.Status.DONE
    assert chore.claimer_id == member.pk


@pytest.mark.django_db
def test_cross_household_claim_forbidden(two_households):
    client = Client()
    member_a = two_households["member_a"]
    chore_b = two_households["open_chore_b"]
    _session_member(client, member_a)

    response = client.post(f"/chores/{chore_b.pk}/claim/")

    assert response.status_code == 403
    chore_b.refresh_from_db()
    assert chore_b.status == Chore.Status.OPEN
    assert chore_b.claimer_id is None
    assert chore_b.claimed_at is None


@pytest.mark.django_db
def test_unauthenticated_claim_denied(two_households):
    client = Client()
    chore = two_households["open_chore_a"]

    response = client.post(f"/chores/{chore.pk}/claim/")

    assert response.status_code == 401
    chore.refresh_from_db()
    assert chore.status == Chore.Status.OPEN
    assert chore.claimer_id is None


@pytest.mark.django_db
def test_invalid_member_id_in_session_denied(two_households):
    client = Client()
    chore = two_households["open_chore_a"]
    session = client.session
    session["member_id"] = 999_999
    session.save()

    response = client.post(f"/chores/{chore.pk}/claim/")

    assert response.status_code == 401
    chore.refresh_from_db()
    assert chore.status == Chore.Status.OPEN
    assert chore.claimer_id is None


@pytest.mark.django_db
def test_double_claim_race_only_one_wins(two_households):
    member_a = two_households["member_a"]
    member_a2 = two_households["member_a2"]
    chore = two_households["open_chore_a"]

    winner = claim_chore(member_a, chore.pk)
    with pytest.raises(ClaimConflictError):
        claim_chore(member_a2, chore.pk)

    chore.refresh_from_db()
    assert winner.status == Chore.Status.CLAIMED
    assert winner.claimer_id == member_a.pk
    assert chore.status == Chore.Status.CLAIMED
    assert chore.claimer_id == member_a.pk
    assert chore.claimed_at is not None
    assert Chore.objects.filter(pk=chore.pk, claimer=member_a2).count() == 0
