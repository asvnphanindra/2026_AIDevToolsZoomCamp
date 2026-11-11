import { fictionalSeed, type SeedRule } from "@/data/fictional-seed";
import { durationMinutes } from "@/lib/blocks";
import { dayKeysForIsoWeek } from "@/lib/week-horizon";
import { DEFAULT_TZ } from "@/lib/time";

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

/** Soft weekly metric: allocated block minutes vs planned daily-min total. */
export type WeekAreaMinimumRow = {
  areaId: string;
  label: string;
  /** Sum of placed block minutes for this area in the week. */
  allocated: number;
  /** Daily min × days in the week (soft target; may deviate). */
  plannedMin: number;
  minMinutesPerDay: number;
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

/**
 * Weekly retrospective: allocated vs planned daily-min total per area.
 * Soft metric only — not a scheduler blocker.
 */
export function evaluateWeekMinimums(
  period: string,
  rules: DailyRule[],
  items: {
    date: string;
    start: string;
    end: string;
    areaId?: string;
    kind?: string;
  }[],
  timeZone = DEFAULT_TZ,
): WeekAreaMinimumRow[] {
  if (!rules.length) return [];
  const dayKeys = dayKeysForIsoWeek(period, timeZone);
  const dayCount = dayKeys.length || 7;
  const asBlocks = items.map((i) => ({
    ...i,
    kind: i.kind ?? "block",
  }));

  const byArea = new Map<string, DailyRule[]>();
  for (const rule of rules) {
    const list = byArea.get(rule.areaId) ?? [];
    list.push(rule);
    byArea.set(rule.areaId, list);
  }

  const rows: WeekAreaMinimumRow[] = [];
  for (const [areaId, areaRules] of byArea) {
    const minMinutesPerDay = areaRules.reduce(
      (sum, r) => sum + r.minMinutesPerDay,
      0,
    );
    const plannedMin = minMinutesPerDay * dayCount;
    const allocated = dayKeys.reduce(
      (sum, date) => sum + minutesForAreaOnDate(date, areaId, asBlocks),
      0,
    );
    const label =
      areaRules.map((r) => r.label).find(Boolean) || areaId;
    rows.push({
      areaId,
      label,
      allocated,
      plannedMin,
      minMinutesPerDay,
    });
  }
  return rows;
}
