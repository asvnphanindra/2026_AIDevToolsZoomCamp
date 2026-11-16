import type { DayTypeKind } from "@/data/fictional-seed";
import { SCHEDULE_COLOUR } from "@/lib/schedule";
import {
  activeTimetable,
  dayOfWeekFromDateKey,
  type TeachingPlanState,
  type TimetableVersion,
} from "@/lib/teaching-plan";
import { minutesOf } from "@/lib/time";

/** Named period window (e.g. P1 09:00–09:50). */
export type SchedulePeriod = {
  id: string;
  name: string;
  start: string;
  end: string;
};

export type ScheduleSlot = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  /** Display label (section / class name). */
  label: string;
  periodId?: string;
};

export type ScheduleVersion = {
  id: string;
  name: string;
  effectiveFrom: string;
  effectiveTo?: string;
  slots: ScheduleSlot[];
};

/** Versioned timetable for any area (Phase 6.1). */
export type Schedule = {
  id: string;
  name: string;
  areaId: string;
  periods?: SchedulePeriod[];
  versions: ScheduleVersion[];
};

export type ExpandedScheduleItem = {
  id: string;
  date: string;
  title: string;
  start: string;
  end: string;
  kind: "schedule";
  colour: string;
  areaId: string;
  scheduleId: string;
};

/** Active version for a date (same rules as teaching-plan activeTimetable). */
export function activeScheduleVersion(
  versions: ScheduleVersion[],
  dateKey: string,
  rangeStart?: string,
  rangeEnd?: string,
): ScheduleVersion | null {
  const start = rangeStart ?? "0000-01-01";
  const end = rangeEnd ?? "9999-12-31";
  const asTt: TimetableVersion[] = versions.map((v) => ({
    id: v.id,
    name: v.name,
    effectiveFrom: v.effectiveFrom,
    effectiveTo: v.effectiveTo,
    slots: v.slots.map((s) => ({
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      sectionId: s.label,
    })),
  }));
  const hit = activeTimetable(asTt, dateKey, start, end);
  if (!hit) return null;
  return versions.find((v) => v.id === hit.id) ?? null;
}

/** Merge back-to-back same-label slots (e.g. 3-period lab). */
export function mergeAdjacentSlots(
  slots: Array<{ start: string; end: string; label: string }>,
): Array<{ start: string; end: string; label: string }> {
  const sorted = [...slots].sort(
    (a, b) =>
      minutesOf(a.start) - minutesOf(b.start) || a.label.localeCompare(b.label),
  );
  const out: Array<{ start: string; end: string; label: string }> = [];
  for (const slot of sorted) {
    const prev = out[out.length - 1];
    if (
      prev &&
      prev.label === slot.label &&
      minutesOf(prev.end) === minutesOf(slot.start)
    ) {
      prev.end = slot.end;
      continue;
    }
    out.push({ ...slot });
  }
  return out;
}

function hidesSchedule(type: DayTypeKind | undefined): boolean {
  return type === "holiday" || type === "no-fixed-schedule";
}

/**
 * Expand all schedules for one date: active version slots for that weekday,
 * merged when adjacent + same label. Skips holiday / no-fixed-schedule.
 */
export function expandSchedulesForDate(
  schedules: Schedule[],
  dateKey: string,
  opts?: {
    dayType?: DayTypeKind;
    colour?: string;
  },
): ExpandedScheduleItem[] {
  if (hidesSchedule(opts?.dayType)) return [];
  const dow = dayOfWeekFromDateKey(dateKey);
  const colour = opts?.colour ?? SCHEDULE_COLOUR;
  const items: ExpandedScheduleItem[] = [];

  for (const schedule of schedules) {
    const rangeStart = schedule.versions
      .map((v) => v.effectiveFrom)
      .sort()[0];
    const rangeEnd = schedule.versions
      .map((v) => v.effectiveTo ?? "9999-12-31")
      .sort()
      .at(-1);
    const version = activeScheduleVersion(
      schedule.versions,
      dateKey,
      rangeStart,
      rangeEnd,
    );
    if (!version) continue;

    const daySlots = version.slots
      .filter((s) => s.dayOfWeek === dow)
      .map((s) => ({
        start: s.startTime,
        end: s.endTime,
        label: s.label,
      }));
    const merged = mergeAdjacentSlots(daySlots);
    for (const [i, slot] of merged.entries()) {
      items.push({
        id: `${schedule.id}-${version.id}-${dateKey}-${i}`,
        date: dateKey,
        title: slot.label,
        start: slot.start,
        end: slot.end,
        kind: "schedule",
        colour,
        areaId: schedule.areaId,
        scheduleId: schedule.id,
      });
    }
  }
  return items;
}

/** Convert a teaching plan's timetables into a generic Schedule. */
export function scheduleFromTeachingPlan(
  plan: TeachingPlanState,
): Schedule {
  const sectionName = new Map(plan.sections.map((s) => [s.id, s.name]));
  return {
    id: `sched-${plan.id}`,
    name: "Teaching timetable",
    areaId: plan.areaId,
    versions: plan.timetables.map((tt) => ({
      id: tt.id,
      name: tt.name,
      effectiveFrom: tt.effectiveFrom,
      effectiveTo: tt.effectiveTo ?? plan.semesterEnd,
      slots: tt.slots.map((s) => ({
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        label: sectionName.get(s.sectionId) ?? s.sectionId,
      })),
    })),
  };
}
