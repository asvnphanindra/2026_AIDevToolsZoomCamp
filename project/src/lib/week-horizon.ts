import { fictionalSeed, type SeedWeekHorizonItem } from "@/data/fictional-seed";
import {
  isoWeekPeriod,
  nextIsoWeekPeriod,
} from "@/lib/goals";
import { dateKeyInTz, DEFAULT_TZ, weekdaySun0 } from "@/lib/time";

const STORAGE_KEY = "work-planner.week-horizon";

export type WeekPlacement = "day" | "week";

/** Horizon item for the 3-week view (US-E3) — day or sometime-this-week; no clock. */
export type WeekHorizonItem = {
  id: string;
  title: string;
  areaId: string;
  /** ISO week `YYYY-Www`. */
  period: string;
  placement: WeekPlacement;
  /** Required when placement is `day` (`YYYY-MM-DD` in that week). */
  date?: string;
  done?: boolean;
};

export type WeekColumn = {
  period: string;
  label: string;
  /** Monday…Sunday date keys for the ISO week. */
  dayKeys: string[];
};

/** Monday (UTC noon) for ISO week `YYYY-Www`. */
export function mondayOfIsoWeek(period: string): Date {
  const match = /^(\d{4})-W(\d{2})$/.exec(period);
  if (!match) throw new Error(`Invalid ISO week period: ${period}`);
  const year = Number(match[1]);
  const week = Number(match[2]);
  const jan4 = new Date(Date.UTC(year, 0, 4, 12, 0, 0));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Mon = new Date(jan4);
  week1Mon.setUTCDate(jan4.getUTCDate() - (jan4Day - 1));
  const targetMon = new Date(week1Mon);
  targetMon.setUTCDate(week1Mon.getUTCDate() + (week - 1) * 7);
  return targetMon;
}

/** Seven YYYY-MM-DD keys Mon…Sun for an ISO week, labeled in `timeZone`. */
export function dayKeysForIsoWeek(
  period: string,
  timeZone = DEFAULT_TZ,
): string[] {
  const mon = mondayOfIsoWeek(period);
  const keys: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(mon.getTime() + i * 86_400_000);
    keys.push(dateKeyInTz(d, timeZone === "UTC" ? "UTC" : timeZone));
  }
  // Prefer calendar keys in the user's TZ by walking from a TZ-aware Monday.
  if (timeZone === "UTC") return keys;

  // Re-derive via local date strings: find a day in this ISO week, walk to Monday.
  const sample = dateKeyInTz(mon, timeZone);
  let cursor = new Date(`${sample}T12:00:00`);
  // Adjust until weekday is Monday in TZ.
  for (let guard = 0; guard < 8; guard++) {
    const key = dateKeyInTz(cursor, timeZone);
    if (weekdaySun0(key, timeZone) === 1) break;
    cursor = new Date(cursor.getTime() - 86_400_000);
  }
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(cursor.getTime() + i * 86_400_000);
    out.push(dateKeyInTz(d, timeZone));
  }
  return out;
}

export function threeWeekColumns(
  from = new Date(),
  timeZone = DEFAULT_TZ,
): WeekColumn[] {
  const current = isoWeekPeriod(from, timeZone);
  const periods = [
    current,
    nextIsoWeekPeriod(current),
    nextIsoWeekPeriod(nextIsoWeekPeriod(current)),
  ];
  return periods.map((period, index) => ({
    period,
    label:
      index === 0
        ? `${period} · this week`
        : index === 1
          ? `${period} · next`
          : period,
    dayKeys: dayKeysForIsoWeek(period, timeZone),
  }));
}

export function seedWeekHorizon(
  timeZone = DEFAULT_TZ,
  from = new Date(),
): WeekHorizonItem[] {
  const columns = threeWeekColumns(from, timeZone);
  const current = columns[0]!;
  const next = columns[1]!;
  const raw = (fictionalSeed.weekHorizon ?? []) as SeedWeekHorizonItem[];

  return raw.map((item, i) => {
    const period =
      item.weekOffset === 1
        ? next.period
        : item.weekOffset === 2
          ? columns[2]!.period
          : current.period;
    const dayKeys =
      item.weekOffset === 1
        ? next.dayKeys
        : item.weekOffset === 2
          ? columns[2]!.dayKeys
          : current.dayKeys;

    if (item.placement === "day") {
      const dayIndex = Math.min(
        6,
        Math.max(0, item.dayIndex ?? 0),
      );
      return {
        id: item.id || `wh-seed-${i}`,
        title: item.title,
        areaId: item.areaId,
        period,
        placement: "day" as const,
        date: dayKeys[dayIndex]!,
        done: Boolean(item.done),
      };
    }

    return {
      id: item.id || `wh-seed-${i}`,
      title: item.title,
      areaId: item.areaId,
      period,
      placement: "week" as const,
      done: Boolean(item.done),
    };
  });
}

export function readWeekHorizon(): WeekHorizonItem[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WeekHorizonItem[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeWeekHorizon(items: WeekHorizonItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function loadWeekHorizon(timeZone = DEFAULT_TZ): WeekHorizonItem[] {
  const stored =
    typeof localStorage !== "undefined" ? readWeekHorizon() : null;
  if (stored && stored.length) return stored;
  const seeded = seedWeekHorizon(timeZone);
  if (typeof localStorage !== "undefined" && seeded.length) {
    writeWeekHorizon(seeded);
  }
  return seeded;
}

export function nextWeekHorizonId(items: WeekHorizonItem[]): string {
  const base = `wh-${Date.now().toString(36)}`;
  if (!items.some((i) => i.id === base)) return base;
  return `${base}-${items.length + 1}`;
}

export function itemsForWeek(
  items: WeekHorizonItem[],
  period: string,
): WeekHorizonItem[] {
  return items
    .filter((i) => i.period === period)
    .sort((a, b) => {
      if (a.placement !== b.placement) {
        return a.placement === "week" ? -1 : 1;
      }
      if (a.placement === "day" && b.placement === "day") {
        return (a.date ?? "").localeCompare(b.date ?? "");
      }
      return a.title.localeCompare(b.title);
    });
}

export function itemsForDay(
  items: WeekHorizonItem[],
  date: string,
): WeekHorizonItem[] {
  return items
    .filter((i) => i.placement === "day" && i.date === date)
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function weekBucketItems(
  items: WeekHorizonItem[],
  period: string,
): WeekHorizonItem[] {
  return items
    .filter((i) => i.period === period && i.placement === "week")
    .sort((a, b) => a.title.localeCompare(b.title));
}
