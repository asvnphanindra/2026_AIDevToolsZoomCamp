import { fictionalSeed, type SeedRule } from "@/data/fictional-seed";
import {
  addMinutes,
  durationMinutes,
  findConflicts,
  type TimedItem,
} from "@/lib/blocks";
import { formatHhmm } from "@/lib/time";

const STORAGE_KEY = "work-planner.daily-rules";

export type DailyRule = SeedRule;

export type RuleShortfall = {
  ruleId: string;
  areaId: string;
  label: string;
  required: number;
  actual: number;
  missing: number;
};

export type DayRuleStatus = {
  date: string;
  shortfalls: RuleShortfall[];
};

export function seedRules(): DailyRule[] {
  return (fictionalSeed.rules ?? []).map((r) => ({ ...r }));
}

export function readRules(): DailyRule[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DailyRule[];
  } catch {
    return null;
  }
}

export function writeRules(rules: DailyRule[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
}

export function loadRules(): DailyRule[] {
  const stored = typeof localStorage !== "undefined" ? readRules() : null;
  if (stored && stored.length) return stored;
  const seeded = seedRules();
  if (typeof localStorage !== "undefined" && seeded.length) writeRules(seeded);
  return seeded;
}

/** Minutes planned for an area on a date (blocks with areaId). */
export function minutesForAreaOnDate(
  date: string,
  areaId: string,
  items: {
    date: string;
    start: string;
    end: string;
    areaId?: string;
    kind: string;
  }[],
): number {
  return items
    .filter(
      (i) =>
        i.date === date &&
        i.areaId === areaId &&
        i.kind === "block",
    )
    .reduce((sum, i) => sum + durationMinutes(i.start, i.end), 0);
}

export function evaluateDayRules(
  date: string,
  rules: DailyRule[],
  items: {
    date: string;
    start: string;
    end: string;
    areaId?: string;
    kind: string;
  }[],
): RuleShortfall[] {
  const shortfalls: RuleShortfall[] = [];
  for (const rule of rules) {
    const actual = minutesForAreaOnDate(date, rule.areaId, items);
    if (actual < rule.minMinutesPerDay) {
      shortfalls.push({
        ruleId: rule.id,
        areaId: rule.areaId,
        label: rule.label || rule.areaId,
        required: rule.minMinutesPerDay,
        actual,
        missing: rule.minMinutesPerDay - actual,
      });
    }
  }
  return shortfalls;
}

export function evaluateVisibleDays(
  dayKeys: string[],
  rules: DailyRule[],
  items: {
    date: string;
    start: string;
    end: string;
    areaId?: string;
    kind: string;
  }[],
): DayRuleStatus[] {
  return dayKeys.map((date) => ({
    date,
    shortfalls: evaluateDayRules(date, rules, items),
  }));
}

/** Find first free slot of `needMin` minutes on `date` within grid hours. */
export function suggestFreeSlot(
  date: string,
  needMin: number,
  startHour: number,
  endHour: number,
  items: TimedItem[],
): { start: string; end: string } | null {
  const need = Math.max(15, Math.ceil(needMin / 15) * 15);
  const dayItems = items.filter((i) => i.date === date);
  for (let m = startHour * 60; m + need <= endHour * 60; m += 15) {
    const start = formatHhmm(m);
    const end = addMinutes(start, need);
    const conflicts = findConflicts({ date, start, end }, dayItems);
    if (!conflicts.length) return { start, end };
  }
  return null;
}

export function shortfallBadgeText(shortfalls: RuleShortfall[]): string {
  if (!shortfalls.length) return "";
  return shortfalls
    .map((s) => `${s.label}: ${s.actual}/${s.required}m`)
    .join(" · ");
}
