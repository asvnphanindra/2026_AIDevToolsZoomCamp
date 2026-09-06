from django.core.exceptions import ValidationError
from django.db import models


class Household(models.Model):
    name = models.CharField(max_length=200)
    invite_code = models.CharField(max_length=64, blank=True, default="")

    def clean(self):
        super().clean()
        if not self.name or not self.name.strip():
            raise ValidationError({"name": "Name must be non-empty."})

    def __str__(self):
        return self.name


class Member(models.Model):
    class Role(models.TextChoices):
        ADMIN = "admin", "Admin"
        MEMBER = "member", "Member"

    household = models.ForeignKey(
        Household,
        on_delete=models.CASCADE,
        related_name="members",
    )
    display_name = models.CharField(max_length=100)
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["household", "display_name"],
                name="unique_member_display_name_per_household",
            ),
            models.CheckConstraint(
                condition=models.Q(role__in=["admin", "member"]),
                name="member_role_valid",
            ),
        ]

    def clean(self):
        super().clean()
        if not self.display_name or not self.display_name.strip():
            raise ValidationError({"display_name": "Display name must be non-empty."})
        if self.role not in Member.Role.values:
            raise ValidationError({"role": "Role must be 'admin' or 'member'."})

    def __str__(self):
        return f"{self.display_name} ({self.role})"


class RecurringTemplate(models.Model):
    class Cadence(models.TextChoices):
        DAILY = "daily", "Daily"
        WEEKLY = "weekly", "Weekly"

    household = models.ForeignKey(
        Household,
        on_delete=models.CASCADE,
        related_name="recurring_templates",
    )
    title = models.CharField(max_length=200)
    cadence = models.CharField(
        max_length=20,
        choices=Cadence.choices,
    )
    anchor_date = models.DateField()
    is_active = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(cadence__in=["daily", "weekly"]),
                name="recurring_template_cadence_valid",
            ),
        ]

    def clean(self):
        super().clean()
        if not self.title or not self.title.strip():
            raise ValidationError({"title": "Title must be non-empty."})
        if self.cadence not in RecurringTemplate.Cadence.values:
            raise ValidationError({"cadence": "Cadence must be 'daily' or 'weekly'."})

    def __str__(self):
        return f"{self.title} ({self.cadence})"


class Chore(models.Model):
    class Status(models.TextChoices):
        OPEN = "open", "Open"
        CLAIMED = "claimed", "Claimed"
        DONE = "done", "Done"

    household = models.ForeignKey(
        Household,
        on_delete=models.CASCADE,
        related_name="chores",
    )
    title = models.CharField(max_length=200)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.OPEN,
    )
    claimer = models.ForeignKey(
        Member,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="claimed_chores",
    )
    template = models.ForeignKey(
        RecurringTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="spawned_chores",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    claimed_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(status__in=["open", "claimed", "done"]),
                name="chore_status_valid",
            ),
        ]

    def clean(self):
        super().clean()
        if not self.title or not self.title.strip():
            raise ValidationError({"title": "Title must be non-empty."})
        if self.status not in Chore.Status.values:
            raise ValidationError({"status": "Status must be 'open', 'claimed', or 'done'."})
        if self.claimer_id is not None and self.claimer.household_id != self.household_id:
            raise ValidationError(
                {"claimer": "Claimer must belong to the same household as the chore."}
            )
        if self.template_id is not None and self.template.household_id != self.household_id:
            raise ValidationError(
                {"template": "Template must belong to the same household as the chore."}
            )

    def __str__(self):
        return f"{self.title} ({self.status})"
