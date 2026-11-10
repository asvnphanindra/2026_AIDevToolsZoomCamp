import {
  fictionalSeed,
  type SeedArea,
  type SeedBlock,
  type SeedRoutine,
  type SeedSchedule,
} from "@/data/fictional-seed";
import {
  DEFAULT_TZ,
  minutesOf,
  nextDayKeys,
  weekdaySun0,
} from "@/lib/time";

export type GridItemKind = "block" | "routine" | "schedule";

export type GridItem = {
  id: string;
  date: string;
  title: string;
  start: string;
  end: string;
  kind: GridItemKind;
  colour: string;
  areaId?: string;
};

export const SCHEDULE_COLOUR = "#C45C26";
export const ROUTINE_COLOUR = "#9AA29A";

export type DayGridModel = {
  timezone: string;
  startHour: number;
  endHour: number;
  dayKeys: string[];
  todayKey: string;
  items: GridItem[];
  areas: SeedArea[];
  updatedAt: Date;
};

/** Build today+2 grid; demo uses fictional seed, owner starts empty. */
export function buildDayGrid(opts: {
  isDemo: boolean;
  areas: SeedArea[];
  timezone?: string;
  startHour?: number;
  endHour?: number;
  now?: Date;
}): DayGridModel {
  const timezone = opts.timezone || DEFAULT_TZ;
  const startHour =
    opts.startHour ?? fictionalSeed.profile.settings.gridStartHour;
  const endHour = opts.endHour ?? fictionalSeed.profile.settings.gridEndHour;
  const now = opts.now ?? new Date();
  const dayKeys = nextDayKeys(3, timezone, now);
  const todayKey = dayKeys[0]!;
  const areas = opts.areas.length ? opts.areas : fictionalSeed.areas;
  const areaColour = new Map(areas.map((a) => [a.id, a.colour]));

  const items: GridItem[] = opts.isDemo
    ? expandSeedItems(dayKeys, timezone, areaColour)
    : [];

  return {
    timezone,
    startHour,
    endHour,
    dayKeys,
    todayKey,
    items,
    areas,
    updatedAt: now,
  };
}

function expandSeedItems(
  dayKeys: string[],
  timezone: string,
  areaColour: Map<string, string>,
): GridItem[] {
  const items: GridItem[] = [];

  for (const dayKey of dayKeys) {
    const wd = weekdaySun0(dayKey, timezone);
    for (const routine of fictionalSeed.routines as SeedRoutine[]) {
      if (!routine.weekdays.includes(wd)) continue;
      items.push({
        id: `${routine.id}-${dayKey}`,
        date: dayKey,
        title: routine.label,
        start: routine.start,
        end: routine.end,
        kind: "routine",
        colour: ROUTINE_COLOUR,
      });
    }
    for (const fixed of fictionalSeed.schedule as SeedSchedule[]) {
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
  }

  for (const block of fictionalSeed.blocks as SeedBlock[]) {
    const date = dayKeys[block.dayOffset];
    if (!date) continue;
    items.push({
      id: block.id,
      date,
      title: block.title,
      start: block.start,
      end: block.end,
      kind: "block",
      colour: areaColour.get(block.areaId) || "#0F6B4C",
      areaId: block.areaId,
    });
  }

  return items;
}

/** Row span for a grid item within the visible window. */
export function itemPlacement(
  item: GridItem,
  startHour: number,
  endHour: number,
): { rowStart: number; rowSpan: number } | null {
  const windowStart = startHour * 60;
  const windowEnd = endHour * 60;
  const start = Math.max(minutesOf(item.start), windowStart);
  const end = Math.min(minutesOf(item.end), windowEnd);
  if (end <= start) return null;
  const rowStart = Math.floor((start - windowStart) / 30) + 2; // +1 header, 1-based
  const rowSpan = Math.max(1, Math.ceil((end - start) / 30));
  return { rowStart, rowSpan };
}
