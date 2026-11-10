import {
  BAND_COLOURS,
  fictionalSeed,
  type EnergyLevel,
  type SeedArea,
  type SeedBand,
  type SeedBlock,
  type SeedDayType,
  type SeedRoutine,
} from "@/data/fictional-seed";
import type {
  ScheduleChangeKind,
  SeedScheduleChange,
} from "@/data/fictional-seed";
import type { PlacedBlock } from "@/lib/blocks";
import {
  applyScheduleChanges,
  dayTypeForOffset,
  expandFixedSchedule,
  hidesCommute,
  SCHEDULE_COLOUR,
} from "@/lib/schedule";
import {
  DEFAULT_TZ,
  minutesOf,
  weekCenteredDayKeys,
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
  deepWork?: boolean;
  /** User-placed from backlog (US-C2); movable/resizable. */
  placed?: boolean;
  taskId?: string;
  /** US-B5 one-off marker when kind is schedule. */
  oneOff?: ScheduleChangeKind;
  /** Underlying schedule-change id for removable one-offs. */
  changeId?: string;
};

export type DeepWorkWarning = {
  blockId: string;
  title: string;
  date: string;
  start: string;
  end: string;
};

export { SCHEDULE_COLOUR };
export const ROUTINE_COLOUR = "#9AA29A";

export type DayGridModel = {
  timezone: string;
  startHour: number;
  endHour: number;
  dayKeys: string[];
  todayKey: string;
  todayIndex: number;
  items: GridItem[];
  areas: SeedArea[];
  bands: SeedBand[];
  dayTypes: SeedDayType[];
  scheduleFromSeed: number;
  warnings: DeepWorkWarning[];
  updatedAt: Date;
};

/** Build today−3…today+3 grid. Fixed schedule always from seed (US-B3/B4). */
export function buildDayGrid(opts: {
  isDemo: boolean;
  areas: SeedArea[];
  timezone?: string;
  startHour?: number;
  endHour?: number;
  now?: Date;
  /** Effective day types (seed + user overrides). */
  dayTypes?: SeedDayType[];
  /** Seed + user one-off schedule changes (US-B5). */
  scheduleChanges?: SeedScheduleChange[];
  /** User-placed blocks from backlog drag (US-C2). */
  placedBlocks?: PlacedBlock[];
}): DayGridModel {
  const timezone = opts.timezone || DEFAULT_TZ;
  const startHour =
    opts.startHour ?? fictionalSeed.profile.settings.gridStartHour;
  const endHour = opts.endHour ?? fictionalSeed.profile.settings.gridEndHour;
  const now = opts.now ?? new Date();
  const { keys: dayKeys, todayIndex } = weekCenteredDayKeys(timezone, now);
  const todayKey = dayKeys[todayIndex]!;
  const areas = opts.areas.length ? opts.areas : fictionalSeed.areas;
  const bands = fictionalSeed.bands;
  const dayTypes = opts.dayTypes ?? fictionalSeed.dayTypes;
  const scheduleChanges =
    opts.scheduleChanges ?? fictionalSeed.scheduleChanges ?? [];
  const areaColour = new Map(areas.map((a) => [a.id, a.colour]));

  const baseSchedule = expandFixedSchedule(
    dayKeys,
    timezone,
    todayIndex,
    fictionalSeed.schedule,
    dayTypes,
  );
  const scheduleItems: GridItem[] = applyScheduleChanges(
    baseSchedule,
    dayKeys,
    todayIndex,
    scheduleChanges,
  ).map((item) => ({
    id: item.id,
    date: item.date,
    title: item.title,
    start: item.start,
    end: item.end,
    kind: "schedule" as const,
    colour: item.colour,
    oneOff: item.oneOff,
    changeId: item.id.startsWith("oneoff-")
      ? item.id.slice("oneoff-".length)
      : undefined,
  }));
  const demoItems = opts.isDemo
    ? expandDemoExtras(dayKeys, todayIndex, timezone, areaColour, dayTypes)
    : [];
  const placedItems: GridItem[] = (opts.placedBlocks ?? []).map((b) => ({
    id: b.id,
    date: b.date,
    title: b.title,
    start: b.start,
    end: b.end,
    kind: "block" as const,
    colour: b.colour,
    areaId: b.areaId,
    deepWork: b.deepWork,
    placed: true,
    taskId: b.taskId,
  }));
  const items = [...scheduleItems, ...demoItems, ...placedItems];

  return {
    timezone,
    startHour,
    endHour,
    dayKeys,
    todayKey,
    todayIndex,
    items,
    areas,
    bands,
    dayTypes,
    scheduleFromSeed: fictionalSeed.schedule.length,
    warnings: findDeepWorkInLowBand(items, bands, timezone),
    updatedAt: now,
  };
}

/** Routines + task blocks for demo; commute hidden when day type hides fixed. */
function expandDemoExtras(
  dayKeys: string[],
  todayIndex: number,
  timezone: string,
  areaColour: Map<string, string>,
  dayTypes: SeedDayType[],
): GridItem[] {
  const items: GridItem[] = [];

  for (const [index, dayKey] of dayKeys.entries()) {
    const relative = index - todayIndex;
    const wd = weekdaySun0(dayKey, timezone);
    const hideCommute = hidesCommute(
      dayTypeForOffset(relative, dayTypes)?.type,
    );
    for (const routine of fictionalSeed.routines as SeedRoutine[]) {
      if (!routine.weekdays.includes(wd)) continue;
      if (hideCommute && /commute/i.test(routine.label)) continue;
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
  }

  for (const block of fictionalSeed.blocks as SeedBlock[]) {
    const index = todayIndex + block.dayOffset;
    const date = dayKeys[index];
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
      deepWork: Boolean(block.deepWork),
    });
  }

  return items;
}

export function bandColour(level: EnergyLevel): string {
  return BAND_COLOURS[level];
}

export function slotBandLevel(
  slotHhmm: string,
  bands: SeedBand[],
  weekday: number,
): EnergyLevel | null {
  const start = minutesOf(slotHhmm);
  const end = start + 30;
  for (const band of bands) {
    if (band.weekdays.length && !band.weekdays.includes(weekday)) continue;
    const bStart = minutesOf(band.start);
    const bEnd = minutesOf(band.end);
    if (start < bEnd && end > bStart) return band.level;
  }
  return null;
}

export function findDeepWorkInLowBand(
  items: GridItem[],
  bands: SeedBand[],
  timezone: string,
): DeepWorkWarning[] {
  const warnings: DeepWorkWarning[] = [];
  for (const item of items) {
    if (item.kind !== "block" || !item.deepWork) continue;
    const wd = weekdaySun0(item.date, timezone);
    const lowBands = bands.filter(
      (b) =>
        b.level === "low" &&
        (!b.weekdays.length || b.weekdays.includes(wd)),
    );
    for (const band of lowBands) {
      if (rangesOverlap(item.start, item.end, band.start, band.end)) {
        warnings.push({
          blockId: item.id,
          title: item.title,
          date: item.date,
          start: item.start,
          end: item.end,
        });
        break;
      }
    }
  }
  return warnings;
}

function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return (
    minutesOf(aStart) < minutesOf(bEnd) && minutesOf(aEnd) > minutesOf(bStart)
  );
}

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
  const rowStart = Math.floor((start - windowStart) / 30) + 2;
  const rowSpan = Math.max(1, Math.ceil((end - start) / 30));
  return { rowStart, rowSpan };
}
