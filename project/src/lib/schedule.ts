import {
  DAY_TYPE_LABELS,
  fictionalSeed,
  type DayTypeKind,
  type SeedDayType,
  type SeedSchedule,
  type SeedScheduleChange,
  type ScheduleChangeKind,
} from "@/data/fictional-seed";
import { minutesOf, weekdaySun0 } from "@/lib/time";

export const SCHEDULE_COLOUR = "#C45C26";
export const GREYED_SCHEDULE_COLOUR = "#9B9B9B";
export const ONLINE_SLOT_COLOUR = "#5B7C99";
export const ONE_OFF_COLOUR = "#8B4513";

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
  oneOff?: ScheduleChangeKind;
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

export function dayTypeForOffset(
  relativeOffset: number,
  dayTypes: SeedDayType[] = fictionalSeed.dayTypes,
): SeedDayType | undefined {
  return dayTypes.find((d) => d.dayOffset === relativeOffset);
}

export function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return (
    minutesOf(aStart) < minutesOf(bEnd) && minutesOf(aEnd) > minutesOf(bStart)
  );
}

/**
 * Expand seeded weekly schedule + online slots (US-B3/B4).
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

/** US-B5 — apply date-scoped cancel / substitute / extra onto schedule items. */
export function applyScheduleChanges(
  items: ScheduleGridItem[],
  dayKeys: string[],
  todayIndex: number,
  changes: SeedScheduleChange[],
): ScheduleGridItem[] {
  let next = [...items];
  for (const change of changes) {
    const date = dayKeys[todayIndex + change.dayOffset];
    if (!date) continue;

    if (change.kind === "cancel" || change.kind === "substitute") {
      next = next.filter(
        (item) =>
          !(
            item.date === date &&
            item.kind === "schedule" &&
            !item.oneOff &&
            rangesOverlap(item.start, item.end, change.start, change.end)
          ),
      );
    }

    if (change.kind === "cancel") continue;

    next.push({
      id: `oneoff-${change.id}`,
      date,
      title:
        change.kind === "substitute"
          ? `${change.title} (sub)`
          : `${change.title} (extra)`,
      start: change.start,
      end: change.end,
      kind: "schedule",
      colour: ONE_OFF_COLOUR,
      oneOff: change.kind,
    });
  }
  return next;
}

export function findOverlappingSchedule(
  items: { date: string; start: string; end: string; title: string }[],
  date: string,
  start: string,
  end: string,
): { title: string; start: string; end: string }[] {
  return items
    .filter(
      (item) =>
        item.date === date && rangesOverlap(item.start, item.end, start, end),
    )
    .map((item) => ({
      title: item.title,
      start: item.start,
      end: item.end,
    }));
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

export function mergeScheduleChanges(
  base: SeedScheduleChange[],
  extras: SeedScheduleChange[],
): SeedScheduleChange[] {
  const map = new Map<string, SeedScheduleChange>();
  for (const c of base) map.set(c.id, c);
  for (const c of extras) map.set(c.id, c);
  return [...map.values()];
}
