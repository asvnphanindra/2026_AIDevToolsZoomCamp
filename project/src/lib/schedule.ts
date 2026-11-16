import {
  DAY_TYPE_LABELS,
  type DayTypeKind,
  type OnlineSlot,
  type ScheduleChangeKind,
  type SeedDayType,
  type SeedSchedule,
  type SeedScheduleChange,
} from "@/data/fictional-seed";
import type { ConfigDayType, ConfigScheduleChange } from "@/lib/config";
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

/** Day type with optional absolute date or relative offset. */
export type DayTypeLike = {
  type: DayTypeKind;
  label: string;
  onlineSlots?: OnlineSlot[];
  dayOffset?: number;
  date?: string;
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
  dayTypes: DayTypeLike[] = [],
): DayTypeLike | undefined {
  return dayTypes.find((d) => d.dayOffset === relativeOffset);
}

export function dayTypeForDay(
  dayKey: string,
  relativeOffset: number,
  dayTypes: DayTypeLike[] = [],
): DayTypeLike | undefined {
  const byDate = dayTypes.find((d) => d.date === dayKey);
  if (byDate) return byDate;
  return dayTypeForOffset(relativeOffset, dayTypes);
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
 * Expand weekly schedule + online slots (US-B3/B4).
 * Pass empty schedule/dayTypes for personal accounts with no config.
 */
export function expandFixedSchedule(
  dayKeys: string[],
  timezone: string,
  todayIndex: number,
  schedule: SeedSchedule[] = [],
  dayTypes: DayTypeLike[] = [],
): ScheduleGridItem[] {
  const items: ScheduleGridItem[] = [];
  dayKeys.forEach((dayKey, index) => {
    const relative = index - todayIndex;
    const dayType = dayTypeForDay(dayKey, relative, dayTypes);
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
  changes: Array<SeedScheduleChange | ConfigScheduleChange>,
): ScheduleGridItem[] {
  let next = [...items];
  for (const change of changes) {
    const date =
      "date" in change && change.date
        ? change.date
        : dayKeys[
            todayIndex +
              ("dayOffset" in change ? Number(change.dayOffset) : NaN)
          ];
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

export function seededScheduleCount(schedule: SeedSchedule[] = []): number {
  return schedule.length;
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

export function mergeConfigDayTypes(
  base: ConfigDayType[],
  overrides: ConfigDayType[],
): ConfigDayType[] {
  const map = new Map<string, ConfigDayType>();
  for (const d of base) map.set(d.date, d);
  for (const d of overrides) {
    if (d.type === "normal") map.delete(d.date);
    else map.set(d.date, d);
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
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
