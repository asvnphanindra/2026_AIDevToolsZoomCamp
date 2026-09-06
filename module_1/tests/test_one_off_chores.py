"""Tests for one-off chore creation (issue #3)."""

import pytest
from django.test import Client

from chores.models import Chore, Household, Member
from chores.services import CHORE_TITLE_MAX_LENGTH


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
    member_b = Member.objects.create(
        household=household_b,
        display_name="Member B",
        role=Member.Role.MEMBER,
    )
    return {
        "household_a": household_a,
        "household_b": household_b,
        "admin_a": admin_a,
        "member_a": member_a,
        "member_b": member_b,
    }


@pytest.mark.django_db
def test_member_creates_one_off_successfully(two_households):
    client = Client()
    member = two_households["member_a"]
    _session_member(client, member)

    response = client.post("/chores/one-off/", {"title": "  Sweep porch  "})

    assert response.status_code == 201
    data = response.json()
    chore = Chore.objects.get(pk=data["id"])
    assert chore.title == "Sweep porch"
    assert chore.status == Chore.Status.OPEN
    assert chore.claimer_id is None
    assert chore.template_id is None
    assert chore.household_id == member.household_id


@pytest.mark.django_db
def test_admin_creates_one_off_successfully(two_households):
    client = Client()
    admin = two_households["admin_a"]
    _session_member(client, admin)

    response = client.post("/chores/one-off/", {"title": "Take out trash"})

    assert response.status_code == 201
    chore = Chore.objects.get(pk=response.json()["id"])
    assert chore.household_id == admin.household_id
    assert chore.status == "open"
    assert chore.claimer is None
    assert chore.template is None


@pytest.mark.django_db
def test_blank_whitespace_and_missing_title_rejected(two_households):
    client = Client()
    _session_member(client, two_households["member_a"])
    before = Chore.objects.count()

    for payload in ({"title": ""}, {"title": "   "}, {}):
        response = client.post("/chores/one-off/", payload)
        assert response.status_code == 400

    assert Chore.objects.count() == before


@pytest.mark.django_db
def test_title_longer_than_max_length_rejected(two_households):
    client = Client()
    _session_member(client, two_households["member_a"])
    before = Chore.objects.count()
    too_long = "x" * (CHORE_TITLE_MAX_LENGTH + 1)

    response = client.post("/chores/one-off/", {"title": too_long})

    assert response.status_code == 400
    assert Chore.objects.count() == before


@pytest.mark.django_db
def test_client_supplied_household_status_claimer_template_ignored(two_households):
    client = Client()
    member = two_households["member_a"]
    other = two_households["member_b"]
    household_b = two_households["household_b"]
    _session_member(client, member)

    response = client.post(
        "/chores/one-off/",
        {
            "title": "Do laundry",
            "household": household_b.pk,
            "household_id": household_b.pk,
            "status": Chore.Status.DONE,
            "claimer": other.pk,
            "template": 999,
        },
    )

    assert response.status_code == 201
    chore = Chore.objects.get(pk=response.json()["id"])
    assert chore.household_id == member.household_id
    assert chore.household_id != household_b.pk
    assert chore.status == Chore.Status.OPEN
    assert chore.claimer_id is None
    assert chore.template_id is None


@pytest.mark.django_db
def test_member_of_a_cannot_create_chore_on_household_b(two_households):
    client = Client()
    member_a = two_households["member_a"]
    household_b = two_households["household_b"]
    _session_member(client, member_a)

    response = client.post(
        "/chores/one-off/",
        {"title": "Sneaky chore", "household_id": household_b.pk},
    )

    assert response.status_code == 201
    chore = Chore.objects.get(pk=response.json()["id"])
    assert chore.household_id == member_a.household_id
    assert Chore.objects.filter(household=household_b).count() == 0


@pytest.mark.django_db
def test_unauthenticated_request_denied(two_households):
    client = Client()
    before = Chore.objects.count()

    response = client.post("/chores/one-off/", {"title": "No session"})

    assert response.status_code == 401
    assert Chore.objects.count() == before


@pytest.mark.django_db
def test_invalid_member_id_in_session_denied(two_households):
    client = Client()
    session = client.session
    session["member_id"] = 999_999
    session.save()
    before = Chore.objects.count()

    response = client.post("/chores/one-off/", {"title": "Ghost member"})

    assert response.status_code == 401
    assert Chore.objects.count() == before


@pytest.mark.django_db
def test_json_post_creates_one_off(two_households):
    client = Client()
    member = two_households["member_a"]
    _session_member(client, member)

    response = client.post(
        "/chores/one-off/",
        data='{"title": "JSON chore", "household_id": 1, "status": "done"}',
        content_type="application/json",
    )

    assert response.status_code == 201
    chore = Chore.objects.get(pk=response.json()["id"])
    assert chore.title == "JSON chore"
    assert chore.household_id == member.household_id
    assert chore.status == "open"
