import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.utils import timezone

from chores.models import Chore, Household, Member, RecurringTemplate


@pytest.mark.django_db
def test_create_household_admin_open_chore_and_template():
    household = Household.objects.create(name="Smith Home")
    admin = Member.objects.create(
        household=household,
        display_name="Alex",
        role=Member.Role.ADMIN,
    )
    chore = Chore.objects.create(
        household=household,
        title="Take out trash",
        status=Chore.Status.OPEN,
        claimer=None,
    )
    template = RecurringTemplate.objects.create(
        household=household,
        title="Vacuum living room",
        cadence=RecurringTemplate.Cadence.WEEKLY,
        anchor_date=timezone.localdate(),
    )

    household.refresh_from_db()
    admin.refresh_from_db()
    chore.refresh_from_db()
    template.refresh_from_db()

    assert household.name == "Smith Home"
    assert admin.display_name == "Alex"
    assert admin.role == "admin"
    assert admin.household_id == household.id
    assert chore.title == "Take out trash"
    assert chore.status == "open"
    assert chore.claimer is None
    assert chore.template is None
    assert chore.household_id == household.id
    assert chore.created_at is not None
    assert chore.claimed_at is None
    assert chore.completed_at is None
    assert template.title == "Vacuum living room"
    assert template.cadence == "weekly"
    assert template.household_id == household.id
    assert template.anchor_date is not None


@pytest.mark.django_db
def test_whitespace_only_household_name_fails_full_clean():
    household = Household(name="   ")
    with pytest.raises(ValidationError):
        household.full_clean()


@pytest.mark.django_db
def test_whitespace_only_member_display_name_fails_full_clean():
    household = Household.objects.create(name="Name House")
    member = Member(
        household=household,
        display_name="   ",
        role=Member.Role.MEMBER,
    )
    with pytest.raises(ValidationError):
        member.full_clean()


@pytest.mark.django_db
def test_whitespace_only_chore_title_fails_full_clean():
    household = Household.objects.create(name="Title House")
    chore = Chore(household=household, title="   ", status=Chore.Status.OPEN)
    with pytest.raises(ValidationError):
        chore.full_clean()


@pytest.mark.django_db
def test_invalid_member_role_rejected():
    household = Household.objects.create(name="Role House")
    member = Member(household=household, display_name="Pat", role="owner")
    with pytest.raises(ValidationError):
        member.full_clean()
    with pytest.raises(IntegrityError):
        with transaction.atomic():
            # Bypass choices validation at the Python layer for CheckConstraint.
            Member.objects.create(
                household=household,
                display_name="Pat",
                role="owner",
            )


@pytest.mark.django_db
def test_invalid_chore_status_rejected():
    household = Household.objects.create(name="Status House")
    chore = Chore(household=household, title="Mop", status="pending")
    with pytest.raises(ValidationError):
        chore.full_clean()
    with pytest.raises(IntegrityError):
        with transaction.atomic():
            Chore.objects.create(
                household=household,
                title="Mop",
                status="pending",
            )


@pytest.mark.django_db
def test_invalid_template_cadence_rejected():
    household = Household.objects.create(name="Cadence House")
    template = RecurringTemplate(
        household=household,
        title="Dust shelves",
        cadence="monthly",
        anchor_date=timezone.localdate(),
    )
    with pytest.raises(ValidationError):
        template.full_clean()
    with pytest.raises(IntegrityError):
        with transaction.atomic():
            RecurringTemplate.objects.create(
                household=household,
                title="Dust shelves",
                cadence="monthly",
                anchor_date=timezone.localdate(),
            )


@pytest.mark.django_db
def test_duplicate_display_name_same_household_rejected():
    household = Household.objects.create(name="Dup House")
    other = Household.objects.create(name="Other House")
    Member.objects.create(
        household=household,
        display_name="Sam",
        role=Member.Role.MEMBER,
    )
    # Same name in a different household is allowed.
    Member.objects.create(
        household=other,
        display_name="Sam",
        role=Member.Role.MEMBER,
    )
    with pytest.raises(IntegrityError):
        with transaction.atomic():
            Member.objects.create(
                household=household,
                display_name="Sam",
                role=Member.Role.ADMIN,
            )


@pytest.mark.django_db
def test_open_chore_with_null_claimer_can_be_saved():
    household = Household.objects.create(name="Open House")
    chore = Chore.objects.create(
        household=household,
        title="Wash dishes",
        status=Chore.Status.OPEN,
        claimer=None,
    )
    chore.refresh_from_db()
    assert chore.status == "open"
    assert chore.claimer_id is None
    assert chore.pk is not None


@pytest.mark.django_db
def test_chore_with_template_fk_round_trip():
    household = Household.objects.create(name="Template House")
    template = RecurringTemplate.objects.create(
        household=household,
        title="Take out recycling",
        cadence=RecurringTemplate.Cadence.DAILY,
        anchor_date=timezone.localdate(),
    )
    chore = Chore.objects.create(
        household=household,
        title="Take out recycling",
        status=Chore.Status.OPEN,
        template=template,
    )
    chore.refresh_from_db()
    assert chore.template_id == template.id
    assert chore.template.household_id == household.id


@pytest.mark.django_db
def test_claimer_from_another_household_rejected():
    household = Household.objects.create(name="Chore House")
    other = Household.objects.create(name="Other House")
    outsider = Member.objects.create(
        household=other,
        display_name="Jamie",
        role=Member.Role.MEMBER,
    )
    chore = Chore(
        household=household,
        title="Mow lawn",
        status=Chore.Status.CLAIMED,
        claimer=outsider,
    )
    with pytest.raises(ValidationError) as exc_info:
        chore.full_clean()
    assert "claimer" in exc_info.value.message_dict


@pytest.mark.django_db
def test_template_from_another_household_rejected():
    household = Household.objects.create(name="Chore House")
    other = Household.objects.create(name="Other House")
    foreign_template = RecurringTemplate.objects.create(
        household=other,
        title="Water plants",
        cadence=RecurringTemplate.Cadence.WEEKLY,
        anchor_date=timezone.localdate(),
    )
    chore = Chore(
        household=household,
        title="Water plants",
        status=Chore.Status.OPEN,
        template=foreign_template,
    )
    with pytest.raises(ValidationError) as exc_info:
        chore.full_clean()
    assert "template" in exc_info.value.message_dict
