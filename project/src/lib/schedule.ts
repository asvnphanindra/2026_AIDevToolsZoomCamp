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

export function dayTypeForOffset(
  dayOffset: number,
  dayTypes: SeedDayType[] = fictionalSeed.dayTypes,
): SeedDayType | undefined {
  return dayTypes.find((d) => d.dayOffset === dayOffset);
}

/**
 * US-B3 — expand seeded weekly schedule onto concrete dates.
 * Stored once in seed; no edit UI. Skips dates whose day type hides fixed items.
 */
export function expandFixedSchedule(
  dayKeys: string[],
  timezone: string,
  schedule: SeedSchedule[] = fictionalSeed.schedule,
  dayTypes: SeedDayType[] = fictionalSeed.dayTypes,
): ScheduleGridItem[] {
  const items: ScheduleGridItem[] = [];
  dayKeys.forEach((dayKey, offset) => {
    const dayType = dayTypeForOffset(offset, dayTypes);
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
