"""Spawn open chores from due recurring templates."""

from __future__ import annotations

from datetime import date

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from chores.services import spawn_recurring_chores


class Command(BaseCommand):
    help = (
        "Create open chores for active recurring templates that are due "
        "on the given date (default: today)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--as-of",
            dest="as_of",
            metavar="YYYY-MM-DD",
            default=None,
            help="Evaluate due dates as of this date (default: today, local).",
        )

    def handle(self, *args, **options):
        as_of_raw = options.get("as_of")
        if as_of_raw is None:
            as_of = timezone.localdate()
        else:
            try:
                as_of = date.fromisoformat(as_of_raw)
            except ValueError as exc:
                raise CommandError(
                    f"Invalid --as-of date {as_of_raw!r}; use YYYY-MM-DD."
                ) from exc

        created = spawn_recurring_chores(as_of=as_of)
        self.stdout.write(
            self.style.SUCCESS(
                f"Spawned {len(created)} chore(s) as of {as_of.isoformat()}."
            )
        )
        for chore in created:
            self.stdout.write(
                f"  - [{chore.pk}] {chore.title} "
                f"(household={chore.household_id}, template={chore.template_id})"
            )
