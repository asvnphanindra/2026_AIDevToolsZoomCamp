import {
  fictionalSeed,
  type DayTypeKind,
  type SeedDayType,
  type SeedSchedule,
} from "@/data/fictional-seed";
import { weekdaySun0 } from "@/lib/time";

export const SCHEDULE_COLOUR = "#C45C26";

export type ScheduleGridItem = {
  id: string;
  date: string;
  title: string;
  start: string;
  end: string;
  kind: "schedule";
  colour: string;
};

/** Day types that hide weekly fixed schedule (US-B3/B4). */
export function hidesFixedSchedule(type: DayTypeKind | undefined): boolean {
  return type === "holiday" || type === "no-fixed-schedule";
}

/** `relativeOffset` is days from today (−3…+3 on the week grid). */
export function dayTypeForOffset(
  relativeOffset: number,
  dayTypes: SeedDayType[] = fictionalSeed.dayTypes,
): SeedDayType | undefined {
  return dayTypes.find((d) => d.dayOffset === relativeOffset);
}

/**
 * US-B3 — expand seeded weekly schedule onto concrete dates.
 * `todayIndex` marks which dayKeys entry is today (3 on the 7-day grid).
 */
export function expandFixedSchedule(
  dayKeys: string[],
  timezone: string,
  todayIndex: number,
  schedule: SeedSchedule[] = fictionalSeed.schedule,
  dayTypes: SeedDayType[] = fictionalSeed.dayTypes,
): ScheduleGridItem[] {
  const items: ScheduleGridItem[] = [];
  dayKeys.forEach((dayKey, index) => {
    const relative = index - todayIndex;
    const dayType = dayTypeForOffset(relative, dayTypes);
    if (hidesFixedSchedule(dayType?.type)) return;
    const wd = weekdaySun0(dayKey, timezone);
    for (const fixed of schedule) {
      if (fixed.weekday !== wd) continue;
      items.push({
        id: `${fixed.id}-${dayKey}`,
        date: dayKey,
        title: fixed.title,
        start: fixed.start,
        end: fixed.end,
        kind: "schedule",
        colour: SCHEDULE_COLOUR,
      });
    }
  });
  return items;
}

export function seededScheduleCount(): number {
  return fictionalSeed.schedule.length;
}
