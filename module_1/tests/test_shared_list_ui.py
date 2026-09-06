"""Integration tests for shared list UI (issue #8)."""

import pytest
from django.test import Client
from django.utils import timezone

from chores.models import Chore, Household, Member


def _session_member(client: Client, member: Member) -> None:
    session = client.session
    session["member_id"] = member.pk
    session.save()


@pytest.fixture
def list_fixture(db):
    household_a = Household.objects.create(name="Household A")
    household_b = Household.objects.create(name="Household B")
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

    unclaimed = Chore.objects.create(
        household=household_a,
        title="Sweep porch",
        status=Chore.Status.OPEN,
    )
    mine = Chore.objects.create(
        household=household_a,
        title="Do laundry",
        status=Chore.Status.CLAIMED,
        claimer=member_a,
        claimed_at=timezone.now(),
    )
    others = Chore.objects.create(
        household=household_a,
        title="Take out trash",
        status=Chore.Status.CLAIMED,
        claimer=member_a2,
        claimed_at=timezone.now(),
    )
    done = Chore.objects.create(
        household=household_a,
        title="Already done",
        status=Chore.Status.DONE,
        claimer=member_a,
        claimed_at=timezone.now(),
        completed_at=timezone.now(),
    )
    other_household = Chore.objects.create(
        household=household_b,
        title="Mow lawn",
        status=Chore.Status.OPEN,
    )

    return {
        "household_a": household_a,
        "member_a": member_a,
        "member_a2": member_a2,
        "member_b": member_b,
        "unclaimed": unclaimed,
        "mine": mine,
        "others": others,
        "done": done,
        "other_household": other_household,
    }


@pytest.mark.django_db
def test_list_segments_render_expected_chores(list_fixture):
    client = Client()
    member = list_fixture["member_a"]
    _session_member(client, member)

    response = client.get("/")

    assert response.status_code == 200
    content = response.content.decode()

    assert 'id="unclaimed"' in content
    assert 'id="mine"' in content
    assert 'id="others-claimed"' in content
    assert "Unclaimed" in content
    assert "Mine" in content
    assert "Others’ claimed" in content

    assert list_fixture["unclaimed"].title in content
    assert list_fixture["mine"].title in content
    assert list_fixture["others"].title in content
    assert list_fixture["done"].title not in content
    assert list_fixture["other_household"].title not in content

    assert list(response.context["unclaimed"]) == [list_fixture["unclaimed"]]
    assert list(response.context["mine"]) == [list_fixture["mine"]]
    assert list(response.context["others_claimed"]) == [list_fixture["others"]]

    unclaimed_html = content.split('id="unclaimed"')[1].split('id="mine"')[0]
    mine_html = content.split('id="mine"')[1].split('id="others-claimed"')[0]
    others_html = content.split('id="others-claimed"')[1]

    assert "Claim" in unclaimed_html
    assert "Release" not in unclaimed_html
    assert "Complete" not in unclaimed_html

    assert "Release" in mine_html
    assert "Complete" in mine_html
    assert "Claim" not in mine_html

    assert "Claim" not in others_html
    assert "Release" not in others_html
    assert "Complete" not in others_html
    assert list_fixture["member_a2"].display_name in others_html


@pytest.mark.django_db
def test_unauthenticated_list_denied_with_401_page(list_fixture):
    """Unauthenticated requests get HTTP 401 and a clear denial page."""
    client = Client()

    response = client.get("/")

    assert response.status_code == 401
    content = response.content.decode()
    assert "Access denied" in content
    assert list_fixture["unclaimed"].title not in content


@pytest.mark.django_db
def test_invalid_member_id_denied_with_401_page(list_fixture):
    client = Client()
    session = client.session
    session["member_id"] = 999999
    session.save()

    response = client.get("/")

    assert response.status_code == 401
    assert "Access denied" in response.content.decode()


@pytest.mark.django_db
def test_claim_html_moves_chore_to_mine(list_fixture):
    client = Client()
    member = list_fixture["member_a"]
    chore = list_fixture["unclaimed"]
    _session_member(client, member)

    response = client.post(f"/chores/{chore.pk}/claim/html/")

    assert response.status_code == 302
    assert response["Location"] == "/"
    chore.refresh_from_db()
    assert chore.status == Chore.Status.CLAIMED
    assert chore.claimer_id == member.pk

    list_response = client.get("/")
    assert list(list_response.context["unclaimed"]) == []
    assert chore in list_response.context["mine"]


@pytest.mark.django_db
def test_add_one_off_html_appears_under_unclaimed(list_fixture):
    client = Client()
    member = list_fixture["member_a"]
    _session_member(client, member)

    response = client.post("/chores/one-off/html/", {"title": "Water plants"})

    assert response.status_code == 302
    assert response["Location"] == "/"
    chore = Chore.objects.get(title="Water plants")
    assert chore.household_id == member.household_id
    assert chore.status == Chore.Status.OPEN

    list_response = client.get("/")
    assert chore in list_response.context["unclaimed"]
