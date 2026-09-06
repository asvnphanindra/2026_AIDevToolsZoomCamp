"""Integration tests for admin UI (issue #9)."""

from datetime import date

import pytest
from django.test import Client
from django.utils import timezone

from chores.models import Household, Member, RecurringTemplate


def _session_member(client: Client, member: Member) -> None:
    session = client.session
    session["member_id"] = member.pk
    session.save()


@pytest.fixture
def admin_ui_fixture(db):
    household = Household.objects.create(
        name="Household A",
        invite_code="INVITE-ABC-123",
    )
    other = Household.objects.create(
        name="Household B",
        invite_code="OTHER-CODE",
    )
    admin = Member.objects.create(
        household=household,
        display_name="Admin A",
        role=Member.Role.ADMIN,
    )
    member = Member.objects.create(
        household=household,
        display_name="Member A",
        role=Member.Role.MEMBER,
    )
    template = RecurringTemplate.objects.create(
        household=household,
        title="Vacuum living room",
        cadence=RecurringTemplate.Cadence.WEEKLY,
        anchor_date=timezone.localdate(),
        is_active=True,
    )
    other_template = RecurringTemplate.objects.create(
        household=other,
        title="Mow lawn",
        cadence=RecurringTemplate.Cadence.DAILY,
        anchor_date=timezone.localdate(),
        is_active=True,
    )
    return {
        "household": household,
        "admin": admin,
        "member": member,
        "template": template,
        "other_template": other_template,
    }


@pytest.mark.django_db
def test_admin_loads_page_with_invite_code_member_forbidden(admin_ui_fixture):
    """Admin can load admin page with invite code; member cannot (403)."""
    client = Client()
    admin = admin_ui_fixture["admin"]
    member = admin_ui_fixture["member"]
    invite_code = admin_ui_fixture["household"].invite_code
    template = admin_ui_fixture["template"]

    _session_member(client, admin)
    admin_response = client.get("/household/admin/")

    assert admin_response.status_code == 200
    content = admin_response.content.decode()
    assert invite_code in content
    assert 'id="invite-code"' in content
    assert template.title in content
    assert admin_ui_fixture["other_template"].title not in content
    assert "Create template" in content

    _session_member(client, member)
    member_response = client.get("/household/admin/")

    assert member_response.status_code == 403
    member_content = member_response.content.decode()
    assert "Forbidden" in member_content
    assert invite_code not in member_content
    assert template.title not in member_content


@pytest.mark.django_db
def test_unauthenticated_admin_page_denied_with_401(admin_ui_fixture):
    client = Client()

    response = client.get("/household/admin/")

    assert response.status_code == 401
    content = response.content.decode()
    assert "Access denied" in content
    assert admin_ui_fixture["household"].invite_code not in content


@pytest.mark.django_db
def test_invalid_member_id_admin_page_denied_with_401(admin_ui_fixture):
    client = Client()
    session = client.session
    session["member_id"] = 999999
    session.save()

    response = client.get("/household/admin/")

    assert response.status_code == 401
    assert "Access denied" in response.content.decode()


@pytest.mark.django_db
def test_chores_list_links_to_admin_page(admin_ui_fixture):
    client = Client()
    _session_member(client, admin_ui_fixture["member"])

    response = client.get("/")

    assert response.status_code == 200
    content = response.content.decode()
    assert 'href="/household/admin/"' in content
    assert "Admin / templates" in content


@pytest.mark.django_db
def test_admin_creates_template_via_html_form(admin_ui_fixture):
    client = Client()
    admin = admin_ui_fixture["admin"]
    _session_member(client, admin)
    anchor = date(2026, 9, 1)

    response = client.post(
        "/chores/templates/html/",
        {
            "title": "  Take out trash  ",
            "cadence": "daily",
            "anchor_date": anchor.isoformat(),
        },
    )

    assert response.status_code == 302
    assert response["Location"] == "/household/admin/"
    template = RecurringTemplate.objects.get(title="Take out trash")
    assert template.household_id == admin.household_id
    assert template.cadence == RecurringTemplate.Cadence.DAILY
    assert template.anchor_date == anchor
    assert template.is_active is True


@pytest.mark.django_db
def test_admin_updates_and_deactivates_template_via_html(admin_ui_fixture):
    client = Client()
    admin = admin_ui_fixture["admin"]
    template = admin_ui_fixture["template"]
    _session_member(client, admin)
    new_anchor = date(2026, 10, 15)

    update_response = client.post(
        f"/chores/templates/{template.pk}/html/",
        {
            "title": "Deep clean kitchen",
            "cadence": "daily",
            "anchor_date": new_anchor.isoformat(),
        },
    )
    assert update_response.status_code == 302
    assert update_response["Location"] == "/household/admin/"
    template.refresh_from_db()
    assert template.title == "Deep clean kitchen"
    assert template.cadence == RecurringTemplate.Cadence.DAILY
    assert template.anchor_date == new_anchor
    assert template.is_active is True

    deactivate_response = client.post(
        f"/chores/templates/{template.pk}/deactivate/html/"
    )
    assert deactivate_response.status_code == 302
    assert deactivate_response["Location"] == "/household/admin/"
    template.refresh_from_db()
    assert template.is_active is False


@pytest.mark.django_db
def test_member_forbidden_on_template_html_routes(admin_ui_fixture):
    client = Client()
    member = admin_ui_fixture["member"]
    template = admin_ui_fixture["template"]
    _session_member(client, member)
    before_count = RecurringTemplate.objects.count()

    create_response = client.post(
        "/chores/templates/html/",
        {
            "title": "Should not create",
            "cadence": "daily",
            "anchor_date": "2026-09-01",
        },
    )
    update_response = client.post(
        f"/chores/templates/{template.pk}/html/",
        {
            "title": "Should not update",
            "cadence": "daily",
            "anchor_date": "2026-09-01",
        },
    )
    deactivate_response = client.post(
        f"/chores/templates/{template.pk}/deactivate/html/"
    )

    assert create_response.status_code == 403
    assert update_response.status_code == 403
    assert deactivate_response.status_code == 403
    assert RecurringTemplate.objects.count() == before_count
    template.refresh_from_db()
    assert template.title == "Vacuum living room"
    assert template.is_active is True
