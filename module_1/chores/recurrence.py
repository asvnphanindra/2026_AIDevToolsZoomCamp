"""Pure recurrence helpers for recurring template spawn.

Period-key rules (anchor_date is the recurrence reference):

- **daily**: the period is the calendar day ``as_of``. Period key is
  ``YYYY-MM-DD`` (``as_of.isoformat()``). A daily template is due on every
  ``as_of`` that is on or after ``anchor_date``.

- **weekly**: the period is the 7-day window starting at ``anchor_date`` and
  repeating every 7 days. Period key is the ISO date of that window's start
  (``anchor_date + n*7`` containing ``as_of``). A weekly template is due only
  on dates where ``(as_of - anchor_date).days`` is a non-negative multiple of 7
  (i.e. the same weekday as the anchor, on or after the anchor).

Templates with ``as_of`` before ``anchor_date`` are never due.
"""

from __future__ import annotations

from datetime import date, timedelta


def period_key(cadence: str, anchor_date: date, as_of: date) -> str:
    """Return a stable string key for the cadence period containing ``as_of``."""
    if cadence == "daily":
        return as_of.isoformat()
    if cadence == "weekly":
        delta_days = (as_of - anchor_date).days
        weeks = delta_days // 7
        period_start = anchor_date + timedelta(days=weeks * 7)
        return period_start.isoformat()
    raise ValueError(f"Unsupported cadence: {cadence!r}")


def is_due(cadence: str, anchor_date: date, as_of: date) -> bool:
    """Return True if a template with this cadence/anchor is due on ``as_of``."""
    if as_of < anchor_date:
        return False
    if cadence == "daily":
        return True
    if cadence == "weekly":
        return (as_of - anchor_date).days % 7 == 0
    raise ValueError(f"Unsupported cadence: {cadence!r}")
