"""Tests for admin-managed recurring templates (issue #4)."""

from datetime import date, timedelta

import pytest
from django.test import Client
from django.utils import timezone

from chores.models import Household, Member, RecurringTemplate
from chores.services import TEMPLATE_TITLE_MAX_LENGTH


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
    admin_b = Member.objects.create(
        household=household_b,
        display_name="Admin B",
        role=Member.Role.ADMIN,
    )
    member_b = Member.objects.create(
        household=household_b,
        display_name="Member B",
        role=Member.Role.MEMBER,
    )
    template_a = RecurringTemplate.objects.create(
        household=household_a,
        title="Vacuum living room",
        cadence=RecurringTemplate.Cadence.WEEKLY,
        anchor_date=timezone.localdate(),
        is_active=True,
    )
    template_b = RecurringTemplate.objects.create(
        household=household_b,
        title="Mow lawn",
        cadence=RecurringTemplate.Cadence.DAILY,
        anchor_date=timezone.localdate(),
        is_active=True,
    )
    return {
        "household_a": household_a,
        "household_b": household_b,
        "admin_a": admin_a,
        "member_a": member_a,
        "admin_b": admin_b,
        "member_b": member_b,
        "template_a": template_a,
        "template_b": template_b,
    }


@pytest.mark.django_db
def test_admin_creates_template_successfully(two_households):
    client = Client()
    admin = two_households["admin_a"]
    _session_member(client, admin)
    anchor = date(2026, 9, 1)

    response = client.post(
        "/chores/templates/",
        {
            "title": "  Take out trash  ",
            "cadence": "daily",
            "anchor_date": anchor.isoformat(),
            "household_id": two_households["household_b"].pk,
        },
    )

    assert response.status_code == 201
    data = response.json()
    template = RecurringTemplate.objects.get(pk=data["id"])
    assert template.title == "Take out trash"
    assert template.cadence == RecurringTemplate.Cadence.DAILY
    assert template.anchor_date == anchor
    assert template.is_active is True
    assert template.household_id == admin.household_id
    assert template.household_id != two_households["household_b"].pk


@pytest.mark.django_db
def test_admin_updates_template_successfully(two_households):
    client = Client()
    admin = two_households["admin_a"]
    template = two_households["template_a"]
    _session_member(client, admin)
    new_anchor = timezone.localdate() + timedelta(days=7)

    response = client.post(
        f"/chores/templates/{template.pk}/",
        {
            "title": "  Deep clean kitchen  ",
            "cadence": "daily",
            "anchor_date": new_anchor.isoformat(),
        },
    )

    assert response.status_code == 200
    template.refresh_from_db()
    assert template.title == "Deep clean kitchen"
    assert template.cadence == RecurringTemplate.Cadence.DAILY
    assert template.anchor_date == new_anchor
    assert template.is_active is True


@pytest.mark.django_db
def test_admin_deactivates_template_successfully(two_households):
    client = Client()
    admin = two_households["admin_a"]
    template = two_households["template_a"]
    _session_member(client, admin)

    response = client.post(f"/chores/templates/{template.pk}/deactivate/")

    assert response.status_code == 200
    template.refresh_from_db()
    assert RecurringTemplate.objects.filter(pk=template.pk).exists()
    assert template.is_active is False
    assert response.json()["is_active"] is False


@pytest.mark.django_db
def test_member_forbidden_on_create_update_deactivate(two_households):
    client = Client()
    member = two_households["member_a"]
    template = two_households["template_a"]
    _session_member(client, member)
    before = RecurringTemplate.objects.count()
    original_title = template.title

    create_response = client.post(
        "/chores/templates/",
        {
            "title": "Should fail",
            "cadence": "weekly",
            "anchor_date": timezone.localdate().isoformat(),
        },
    )
    update_response = client.post(
        f"/chores/templates/{template.pk}/",
        {"title": "Hacked title"},
    )
    deactivate_response = client.post(
        f"/chores/templates/{template.pk}/deactivate/"
    )

    assert create_response.status_code == 403
    assert update_response.status_code == 403
    assert deactivate_response.status_code == 403
    assert RecurringTemplate.objects.count() == before
    template.refresh_from_db()
    assert template.title == original_title
    assert template.is_active is True


@pytest.mark.django_db
def test_cross_household_writes_forbidden(two_households):
    client = Client()
    admin_a = two_households["admin_a"]
    template_b = two_households["template_b"]
    household_b = two_households["household_b"]
    _session_member(client, admin_a)
    before_b = RecurringTemplate.objects.filter(household=household_b).count()
    original_title = template_b.title

    create_response = client.post(
        "/chores/templates/",
        {
            "title": "Plant on B",
            "cadence": "daily",
            "anchor_date": timezone.localdate().isoformat(),
            "household_id": household_b.pk,
            "household": household_b.pk,
        },
    )
    update_response = client.post(
        f"/chores/templates/{template_b.pk}/",
        {"title": "Cross-house edit"},
    )
    deactivate_response = client.post(
        f"/chores/templates/{template_b.pk}/deactivate/"
    )

    assert create_response.status_code == 201
    created = RecurringTemplate.objects.get(pk=create_response.json()["id"])
    assert created.household_id == admin_a.household_id
    assert RecurringTemplate.objects.filter(household=household_b).count() == before_b

    assert update_response.status_code == 403
    assert deactivate_response.status_code == 403
    template_b.refresh_from_db()
    assert template_b.title == original_title
    assert template_b.is_active is True


@pytest.mark.django_db
def test_unauthenticated_request_denied(two_households):
    client = Client()
    template = two_households["template_a"]
    before = RecurringTemplate.objects.count()
    original_active = template.is_active

    create_response = client.post(
        "/chores/templates/",
        {
            "title": "No session",
            "cadence": "daily",
            "anchor_date": timezone.localdate().isoformat(),
        },
    )
    update_response = client.post(
        f"/chores/templates/{template.pk}/",
        {"title": "No session update"},
    )
    deactivate_response = client.post(
        f"/chores/templates/{template.pk}/deactivate/"
    )

    assert create_response.status_code == 401
    assert update_response.status_code == 401
    assert deactivate_response.status_code == 401
    assert RecurringTemplate.objects.count() == before
    template.refresh_from_db()
    assert template.is_active is original_active


@pytest.mark.django_db
def test_invalid_member_id_in_session_denied(two_households):
    client = Client()
    session = client.session
    session["member_id"] = 999_999
    session.save()
    template = two_households["template_a"]
    before = RecurringTemplate.objects.count()

    create_response = client.post(
        "/chores/templates/",
        {
            "title": "Ghost",
            "cadence": "weekly",
            "anchor_date": timezone.localdate().isoformat(),
        },
    )
    update_response = client.post(
        f"/chores/templates/{template.pk}/",
        {"title": "Ghost update"},
    )
    deactivate_response = client.post(
        f"/chores/templates/{template.pk}/deactivate/"
    )

    assert create_response.status_code == 401
    assert update_response.status_code == 401
    assert deactivate_response.status_code == 401
    assert RecurringTemplate.objects.count() == before
    template.refresh_from_db()
    assert template.is_active is True


@pytest.mark.django_db
def test_blank_title_rejected_on_create_and_update(two_households):
    client = Client()
    admin = two_households["admin_a"]
    template = two_households["template_a"]
    _session_member(client, admin)
    before = RecurringTemplate.objects.count()
    original_title = template.title

    for payload in ({"title": ""}, {"title": "   "}):
        create_payload = {
            **payload,
            "cadence": "daily",
            "anchor_date": timezone.localdate().isoformat(),
        }
        create_response = client.post("/chores/templates/", create_payload)
        update_response = client.post(
            f"/chores/templates/{template.pk}/", payload
        )
        assert create_response.status_code == 400
        assert update_response.status_code == 400

    assert RecurringTemplate.objects.count() == before
    template.refresh_from_db()
    assert template.title == original_title


@pytest.mark.django_db
def test_overlong_title_rejected_on_create_and_update(two_households):
    client = Client()
    admin = two_households["admin_a"]
    template = two_households["template_a"]
    _session_member(client, admin)
    before = RecurringTemplate.objects.count()
    original_title = template.title
    too_long = "x" * (TEMPLATE_TITLE_MAX_LENGTH + 1)

    create_response = client.post(
        "/chores/templates/",
        {
            "title": too_long,
            "cadence": "weekly",
            "anchor_date": timezone.localdate().isoformat(),
        },
    )
    update_response = client.post(
        f"/chores/templates/{template.pk}/",
        {"title": too_long},
    )

    assert create_response.status_code == 400
    assert update_response.status_code == 400
    assert RecurringTemplate.objects.count() == before
    template.refresh_from_db()
    assert template.title == original_title


@pytest.mark.django_db
def test_invalid_cadence_and_anchor_rejected(two_households):
    client = Client()
    admin = two_households["admin_a"]
    template = two_households["template_a"]
    _session_member(client, admin)
    before = RecurringTemplate.objects.count()
    original_cadence = template.cadence
    original_anchor = template.anchor_date

    bad_create_payloads = [
        {
            "title": "Ok title",
            "cadence": "monthly",
            "anchor_date": timezone.localdate().isoformat(),
        },
        {
            "title": "Ok title",
            "cadence": "daily",
            "anchor_date": "not-a-date",
        },
        {
            "title": "Ok title",
            "cadence": "daily",
        },
    ]
    for payload in bad_create_payloads:
        response = client.post("/chores/templates/", payload)
        assert response.status_code == 400

    bad_update_response = client.post(
        f"/chores/templates/{template.pk}/",
        {"cadence": "yearly", "anchor_date": "32/13/2026"},
    )
    assert bad_update_response.status_code == 400

    assert RecurringTemplate.objects.count() == before
    template.refresh_from_db()
    assert template.cadence == original_cadence
    assert template.anchor_date == original_anchor


@pytest.mark.django_db
def test_json_post_creates_and_updates_template(two_households):
    client = Client()
    admin = two_households["admin_a"]
    _session_member(client, admin)
    anchor = date(2026, 3, 15)

    create_response = client.post(
        "/chores/templates/",
        data=(
            '{"title": "JSON template", "cadence": "weekly",'
            f' "anchor_date": "{anchor.isoformat()}",'
            f' "household_id": {two_households["household_b"].pk}}}'
        ),
        content_type="application/json",
    )

    assert create_response.status_code == 201
    template_id = create_response.json()["id"]
    template = RecurringTemplate.objects.get(pk=template_id)
    assert template.household_id == admin.household_id
    assert template.is_active is True

    update_response = client.post(
        f"/chores/templates/{template_id}/",
        data='{"title": "JSON updated", "cadence": "daily"}',
        content_type="application/json",
    )
    assert update_response.status_code == 200
    template.refresh_from_db()
    assert template.title == "JSON updated"
    assert template.cadence == RecurringTemplate.Cadence.DAILY
