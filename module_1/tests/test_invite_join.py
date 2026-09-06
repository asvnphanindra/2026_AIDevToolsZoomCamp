"""Tests for household create / invite-code join flow (issue #11)."""

import json

import pytest
from django.test import Client, RequestFactory

from chores.helpers import SESSION_MEMBER_ID_KEY, get_current_member
from chores.models import Household, Member


@pytest.mark.django_db
def test_create_household_admin_session_and_invite_code():
    client = Client()
    before_households = Household.objects.count()
    before_members = Member.objects.count()

    response = client.post(
        "/household/create/",
        data=json.dumps({"name": "  New House  ", "display_name": "  Alex  "}),
        content_type="application/json",
    )

    assert response.status_code == 201
    data = response.json()
    assert data["household_id"]
    assert data["member_id"]
    assert data["invite_code"]
    assert data["invite_code"].strip()

    household = Household.objects.get(pk=data["household_id"])
    member = Member.objects.get(pk=data["member_id"])
    assert household.name == "New House"
    assert household.invite_code == data["invite_code"]
    assert member.display_name == "Alex"
    assert member.role == Member.Role.ADMIN
    assert member.household_id == household.pk
    assert client.session[SESSION_MEMBER_ID_KEY] == member.pk
    assert Household.objects.count() == before_households + 1
    assert Member.objects.count() == before_members + 1

    factory = RequestFactory()
    request = factory.get("/")
    request.session = client.session
    assert get_current_member(request) == member


@pytest.mark.django_db
def test_create_household_form_redirects_to_list():
    client = Client()

    response = client.post(
        "/household/create/",
        {"name": "Form House", "display_name": "Pat"},
    )

    assert response.status_code == 302
    assert response["Location"] == "/"
    member = Member.objects.get(display_name="Pat")
    assert member.role == Member.Role.ADMIN
    assert client.session[SESSION_MEMBER_ID_KEY] == member.pk
    assert member.household.invite_code


@pytest.mark.django_db
def test_join_success_sets_member_session():
    household = Household.objects.create(name="Join House", invite_code="JOIN-CODE-1")
    Member.objects.create(
        household=household,
        display_name="Admin",
        role=Member.Role.ADMIN,
    )
    client = Client()

    response = client.post(
        "/household/join/",
        data=json.dumps(
            {"invite_code": "  JOIN-CODE-1  ", "display_name": "  Sam  "}
        ),
        content_type="application/json",
    )

    assert response.status_code == 201
    data = response.json()
    member = Member.objects.get(pk=data["member_id"])
    assert member.display_name == "Sam"
    assert member.role == Member.Role.MEMBER
    assert member.household_id == household.pk
    assert data["household_id"] == household.pk
    assert client.session[SESSION_MEMBER_ID_KEY] == member.pk

    factory = RequestFactory()
    request = factory.get("/")
    request.session = client.session
    assert get_current_member(request) == member


@pytest.mark.django_db
def test_join_form_redirects_to_list():
    household = Household.objects.create(name="Join Form", invite_code="FORM-JOIN-1")
    client = Client()

    response = client.post(
        "/household/join/",
        {"invite_code": "FORM-JOIN-1", "display_name": "Riley"},
    )

    assert response.status_code == 302
    assert response["Location"] == "/"
    member = Member.objects.get(display_name="Riley", household=household)
    assert member.role == Member.Role.MEMBER
    assert client.session[SESSION_MEMBER_ID_KEY] == member.pk


@pytest.mark.django_db
def test_bad_invite_code_rejected_session_unchanged():
    household = Household.objects.create(name="Known", invite_code="REAL-CODE")
    Member.objects.create(
        household=household,
        display_name="Admin",
        role=Member.Role.ADMIN,
    )
    client = Client()
    session = client.session
    session[SESSION_MEMBER_ID_KEY] = 42
    session.save()
    before = Member.objects.count()

    for payload, expected_status in (
        ({"invite_code": "NOPE", "display_name": "Sam"}, 404),
        ({"invite_code": "", "display_name": "Sam"}, 400),
        ({"invite_code": "   ", "display_name": "Sam"}, 400),
        ({"display_name": "Sam"}, 400),
    ):
        response = client.post(
            "/household/join/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert response.status_code == expected_status
        assert client.session.get(SESSION_MEMBER_ID_KEY) == 42
        assert Member.objects.count() == before


@pytest.mark.django_db
def test_blank_names_rejected_no_rows():
    client = Client()
    before_h = Household.objects.count()
    before_m = Member.objects.count()

    for payload in (
        {"name": "", "display_name": "Alex"},
        {"name": "   ", "display_name": "Alex"},
        {"name": "House", "display_name": ""},
        {"name": "House", "display_name": "   "},
        {"display_name": "Alex"},
        {"name": "House"},
    ):
        response = client.post(
            "/household/create/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert response.status_code == 400

    household = Household.objects.create(name="Existing", invite_code="EXIST-1")
    for payload in (
        {"invite_code": "EXIST-1", "display_name": ""},
        {"invite_code": "EXIST-1", "display_name": "   "},
        {"invite_code": "EXIST-1"},
    ):
        response = client.post(
            "/household/join/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert response.status_code == 400

    assert Household.objects.count() == before_h + 1
    assert Member.objects.count() == before_m
    assert not client.session.get(SESSION_MEMBER_ID_KEY)


@pytest.mark.django_db
def test_duplicate_display_name_rejected():
    household = Household.objects.create(name="Dup House", invite_code="DUP-CODE")
    Member.objects.create(
        household=household,
        display_name="Alex",
        role=Member.Role.ADMIN,
    )
    client = Client()
    before = Member.objects.count()

    response = client.post(
        "/household/join/",
        data=json.dumps({"invite_code": "DUP-CODE", "display_name": "Alex"}),
        content_type="application/json",
    )

    assert response.status_code == 400
    assert "display name" in response.json()["error"].lower()
    assert Member.objects.count() == before
    assert not client.session.get(SESSION_MEMBER_ID_KEY)


@pytest.mark.django_db
def test_create_and_join_pages_are_phone_friendly():
    client = Client()

    create_page = client.get("/household/create/")
    join_page = client.get("/household/join/")
    denied = client.get("/")

    assert create_page.status_code == 200
    assert b"Create household" in create_page.content
    assert b'name="name"' in create_page.content
    assert b'name="display_name"' in create_page.content
    assert b'viewport' in create_page.content

    assert join_page.status_code == 200
    assert b"Join household" in join_page.content
    assert b'name="invite_code"' in join_page.content
    assert b'viewport' in join_page.content

    assert denied.status_code == 401
    assert b"/household/create/" in denied.content
    assert b"/household/join/" in denied.content


@pytest.mark.django_db
def test_invite_codes_unique_across_creates():
    client = Client()
    codes = set()
    for i in range(5):
        response = client.post(
            "/household/create/",
            data=json.dumps({"name": f"House {i}", "display_name": f"Admin {i}"}),
            content_type="application/json",
        )
        assert response.status_code == 201
        codes.add(response.json()["invite_code"])
    assert len(codes) == 5
