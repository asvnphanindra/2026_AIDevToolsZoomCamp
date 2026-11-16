import type { EnergyLevel, SeedBand } from "@/data/fictional-seed";
import type { DayGridModel, GridItem } from "@/lib/day-grid";
import { slotBandLevel } from "@/lib/day-grid";
import { formatHhmm, minutesOf, weekdaySun0 } from "@/lib/time";

export type TaskDepth = "deep" | "shallow" | "listen";

export type FreeSlot = {
  start: string;
  end: string;
  band: EnergyLevel;
  allowedDepths: TaskDepth[];
};

export type SlotRule = {
  id: string;
  name: string;
  start: string;
  end: string;
  weekdays?: number[];
  allowedDepths: TaskDepth[];
};

const ALL_DEPTHS: TaskDepth[] = ["deep", "shallow", "listen"];

function occupiedRanges(
  dateKey: string,
  items: GridItem[],
): Array<{ start: number; end: number }> {
  return items
    .filter((i) => i.date === dateKey)
    .map((i) => ({ start: minutesOf(i.start), end: minutesOf(i.end) }))
    .filter((r) => r.end > r.start)
    .sort((a, b) => a.start - b.start);
}

function mergeRanges(
  ranges: Array<{ start: number; end: number }>,
): Array<{ start: number; end: number }> {
  if (!ranges.length) return [];
  const out: Array<{ start: number; end: number }> = [
    { ...ranges[0]! },
  ];
  for (let i = 1; i < ranges.length; i++) {
    const cur = ranges[i]!;
    const prev = out[out.length - 1]!;
    if (cur.start <= prev.end) {
      prev.end = Math.max(prev.end, cur.end);
    } else {
      out.push({ ...cur });
    }
  }
  return out;
}

function depthsForGap(
  start: number,
  end: number,
  weekday: number,
  slotRules: SlotRule[],
): TaskDepth[] {
  const covering = slotRules.filter((r) => {
    if (r.weekdays?.length && !r.weekdays.includes(weekday)) return false;
    return minutesOf(r.start) < end && minutesOf(r.end) > start;
  });
  if (!covering.length) return [...ALL_DEPTHS];
  const allowed = new Set<TaskDepth>(ALL_DEPTHS);
  for (const rule of covering) {
    const keep = new Set(rule.allowedDepths);
    for (const d of [...allowed]) {
      if (!keep.has(d)) allowed.delete(d);
    }
  }
  return [...allowed];
}

function bandForGap(
  start: number,
  end: number,
  bands: SeedBand[],
  weekday: number,
): EnergyLevel {
  const mid = formatHhmm(Math.floor((start + end) / 2));
  return slotBandLevel(mid, bands, weekday) ?? "low";
}

/**
 * Free gaps in the grid window after subtracting schedule, routines, blocks.
 * Pure; used by suggestions and replan (Phase 4.4).
 */
export function freeSlots(
  dateKey: string,
  model: Pick<
    DayGridModel,
    "startHour" | "endHour" | "items" | "bands" | "dayTypes" | "timezone"
  >,
  opts?: {
    minMinutes?: number;
    slotRules?: SlotRule[];
  },
): FreeSlot[] {
  const minMinutes = opts?.minMinutes ?? 30;
  const slotRules = opts?.slotRules ?? [];
  const windowStart = model.startHour * 60;
  const windowEnd = model.endHour * 60;
  if (windowEnd <= windowStart) return [];

  const weekday = weekdaySun0(dateKey, model.timezone);

  const occupied = mergeRanges(occupiedRanges(dateKey, model.items));
  const gaps: FreeSlot[] = [];
  let cursor = windowStart;
  for (const block of occupied) {
    if (block.start > cursor) {
      const gapEnd = Math.min(block.start, windowEnd);
      if (gapEnd - cursor >= minMinutes) {
        gaps.push({
          start: formatHhmm(cursor),
          end: formatHhmm(gapEnd),
          band: bandForGap(cursor, gapEnd, model.bands, weekday),
          allowedDepths: depthsForGap(cursor, gapEnd, weekday, slotRules),
        });
      }
    }
    cursor = Math.max(cursor, block.end);
    if (cursor >= windowEnd) break;
  }
  if (windowEnd - cursor >= minMinutes) {
    gaps.push({
      start: formatHhmm(cursor),
      end: formatHhmm(windowEnd),
      band: bandForGap(cursor, windowEnd, model.bands, weekday),
      allowedDepths: depthsForGap(cursor, windowEnd, weekday, slotRules),
    });
  }
  return gaps;
}
