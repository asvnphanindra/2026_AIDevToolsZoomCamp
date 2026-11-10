import {
  DAY_TYPE_LABELS,
  fictionalSeed,
  type DayTypeKind,
  type SeedDayType,
  type SeedSchedule,
} from "@/data/fictional-seed";
import { weekdaySun0 } from "@/lib/time";

export const SCHEDULE_COLOUR = "#C45C26";
/** Fixed items on Online days are greyed (US-B4 AC2). */
export const GREYED_SCHEDULE_COLOUR = "#9B9B9B";
export const ONLINE_SLOT_COLOUR = "#5B7C99";

export type ScheduleGridItem = {
  id: string;
  date: string;
  title: string;
  start: string;
  end: string;
  kind: "schedule";
  colour: string;
  greyed?: boolean;
  onlineSlot?: boolean;
};

export function hidesFixedSchedule(type: DayTypeKind | undefined): boolean {
  return type === "holiday" || type === "no-fixed-schedule";
}

export function hidesCommute(type: DayTypeKind | undefined): boolean {
  return (
    type === "holiday" ||
    type === "no-fixed-schedule" ||
    type === "online"
  );
}

export function isOnlineDay(type: DayTypeKind | undefined): boolean {
  return type === "online";
}

/** `relativeOffset` is days from today (−3…+3 on the week grid). */
export function dayTypeForOffset(
  relativeOffset: number,
  dayTypes: SeedDayType[] = fictionalSeed.dayTypes,
): SeedDayType | undefined {
  return dayTypes.find((d) => d.dayOffset === relativeOffset);
}

/**
 * Expand seeded weekly schedule + online slots for US-B3/B4.
 * Holiday / No-fixed: hide. Online: grey fixed + show onlineSlots.
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
    const kind = dayType?.type;

    if (hidesFixedSchedule(kind)) return;

    const online = isOnlineDay(kind);
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
        colour: online ? GREYED_SCHEDULE_COLOUR : SCHEDULE_COLOUR,
        greyed: online,
      });
    }

    if (online && dayType?.onlineSlots?.length) {
      dayType.onlineSlots.forEach((slot, i) => {
        items.push({
          id: `online-${dayKey}-${i}`,
          date: dayKey,
          title: slot.title,
          start: slot.start,
          end: slot.end,
          kind: "schedule",
          colour: ONLINE_SLOT_COLOUR,
          onlineSlot: true,
        });
      });
    }
  });
  return items;
}

export function seededScheduleCount(): number {
  return fictionalSeed.schedule.length;
}

export function mergeDayTypes(
  base: SeedDayType[],
  overrides: SeedDayType[],
): SeedDayType[] {
  const map = new Map<number, SeedDayType>();
  for (const d of base) map.set(d.dayOffset, d);
  for (const d of overrides) {
    if (d.type === "normal") map.delete(d.dayOffset);
    else map.set(d.dayOffset, d);
  }
  return [...map.values()].sort((a, b) => a.dayOffset - b.dayOffset);
}

export function defaultLabelFor(type: DayTypeKind): string {
  return DAY_TYPE_LABELS[type];
}
