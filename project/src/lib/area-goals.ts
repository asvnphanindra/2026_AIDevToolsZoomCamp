import {
  fictionalSeed,
  type SeedAreaGoal,
} from "@/data/fictional-seed";
import { dateKeyInTz, DEFAULT_TZ } from "@/lib/time";
import { dayKeysForIsoWeek } from "@/lib/week-horizon";
import { isoWeekPeriod, nextIsoWeekPeriod } from "@/lib/goals";

const STORAGE_KEY = "work-planner.area-goals";

/** Short ~3 weeks, mid ~3 months, long ~3 quarters. */
export type GoalHorizonKind = "short" | "mid" | "long";

export type AreaGoal = {
  id: string;
  areaId: string;
  title: string;
  horizon: GoalHorizonKind;
  /** Inclusive YYYY-MM-DD. */
  startDate: string;
  /** Inclusive YYYY-MM-DD. */
  endDate: string;
  progress?: number;
};

export const HORIZON_LABELS: Record<GoalHorizonKind, string> = {
  short: "Short · ~3 weeks",
  mid: "Mid · ~3 months",
  long: "Long · ~3 quarters",
};

/** Default span in days (inclusive end ≈ start + days). */
export const HORIZON_DEFAULT_DAYS: Record<GoalHorizonKind, number> = {
  short: 20,
  mid: 89,
  long: 272,
};

/** Shared Gantt window: Monday of current ISO week → ~3 quarters later. */
export const GANTT_WINDOW_DAYS = 273;

export function addDaysToDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const utc = new Date(Date.UTC(y!, m! - 1, d!, 12, 0, 0));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

export function daysBetween(startDate: string, endDate: string): number {
  const a = Date.parse(`${startDate}T12:00:00Z`);
  const b = Date.parse(`${endDate}T12:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export function defaultRangeForHorizon(
  horizon: GoalHorizonKind,
  from = new Date(),
  timeZone = DEFAULT_TZ,
): { startDate: string; endDate: string } {
  const startDate = dateKeyInTz(from, timeZone);
  return {
    startDate,
    endDate: addDaysToDateKey(startDate, HORIZON_DEFAULT_DAYS[horizon]),
  };
}

export function ganttWindow(
  from = new Date(),
  timeZone = DEFAULT_TZ,
): { startDate: string; endDate: string; totalDays: number } {
  const period = isoWeekPeriod(from, timeZone);
  const startDate = dayKeysForIsoWeek(period, timeZone)[0]!;
  const endDate = addDaysToDateKey(startDate, GANTT_WINDOW_DAYS - 1);
  return { startDate, endDate, totalDays: GANTT_WINDOW_DAYS };
}

/** Left/width % of a goal bar inside the shared Gantt window. */
export function barPosition(
  goal: Pick<AreaGoal, "startDate" | "endDate">,
  windowStart: string,
  totalDays: number,
): { left: number; width: number; clipped: boolean } {
  const startOffset = daysBetween(windowStart, goal.startDate);
  const endOffset = daysBetween(windowStart, goal.endDate);
  const clipped = startOffset < 0 || endOffset >= totalDays;
  const leftDays = Math.max(0, Math.min(totalDays - 1, startOffset));
  const rightDays = Math.max(leftDays, Math.min(totalDays - 1, endOffset));
  const widthDays = Math.max(1, rightDays - leftDays + 1);
  return {
    left: (leftDays / totalDays) * 100,
    width: (widthDays / totalDays) * 100,
    clipped,
  };
}

export function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

export function seedAreaGoals(
  timeZone = DEFAULT_TZ,
  from = new Date(),
): AreaGoal[] {
  const today = dateKeyInTz(from, timeZone);
  const raw = (fictionalSeed.areaGoals ?? []) as SeedAreaGoal[];
  return raw.map((g, i) => {
    const startDate = addDaysToDateKey(today, g.startOffsetDays ?? 0);
    const endDate = addDaysToDateKey(
      today,
      g.endOffsetDays ?? HORIZON_DEFAULT_DAYS[g.horizon],
    );
    return {
      id: g.id || `ag-seed-${i}`,
      areaId: g.areaId,
      title: g.title,
      horizon: g.horizon,
      startDate,
      endDate: endDate < startDate ? startDate : endDate,
      progress:
        g.progress == null
          ? undefined
          : Math.max(0, Math.min(100, g.progress)),
    };
  });
}

export function readAreaGoals(): AreaGoal[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AreaGoal[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeAreaGoals(goals: AreaGoal[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
}

export function loadAreaGoals(timeZone = DEFAULT_TZ): AreaGoal[] {
  const stored =
    typeof localStorage !== "undefined" ? readAreaGoals() : null;
  if (stored && stored.length) return stored;
  const seeded = seedAreaGoals(timeZone);
  if (typeof localStorage !== "undefined" && seeded.length) {
    writeAreaGoals(seeded);
  }
  return seeded;
}

export function nextAreaGoalId(goals: AreaGoal[]): string {
  const base = `ag-${Date.now().toString(36)}`;
  if (!goals.some((g) => g.id === base)) return base;
  return `${base}-${goals.length + 1}`;
}

export function goalsForArea(
  goals: AreaGoal[],
  areaId: string,
): AreaGoal[] {
  return goals
    .filter((g) => g.areaId === areaId)
    .sort((a, b) => {
      const h =
        horizonRank(a.horizon) - horizonRank(b.horizon);
      if (h !== 0) return h;
      return a.startDate.localeCompare(b.startDate) || a.title.localeCompare(b.title);
    });
}

function horizonRank(h: GoalHorizonKind): number {
  return h === "short" ? 0 : h === "mid" ? 1 : 2;
}

/** Goals whose span overlaps an ISO week (inclusive Mon–Sun). */
export function goalsOverlappingWeek(
  goals: AreaGoal[],
  period: string,
  timeZone = DEFAULT_TZ,
): AreaGoal[] {
  const days = dayKeysForIsoWeek(period, timeZone);
  const weekStart = days[0]!;
  const weekEnd = days[6]!;
  return goals
    .filter((g) => rangesOverlap(g.startDate, g.endDate, weekStart, weekEnd))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

/**
 * Clash when two+ different areas have short goals overlapping the same week.
 * Mid/long ignored for clash noise.
 */
export function shortGoalClashAreas(
  goals: AreaGoal[],
  period: string,
  timeZone = DEFAULT_TZ,
): string[] {
  const short = goalsOverlappingWeek(goals, period, timeZone).filter(
    (g) => g.horizon === "short",
  );
  const areaIds = [...new Set(short.map((g) => g.areaId))];
  return areaIds.length >= 2 ? areaIds : [];
}

/** Month tick labels across the Gantt window. */
export function monthTicks(
  windowStart: string,
  totalDays: number,
): { date: string; label: string; left: number }[] {
  const ticks: { date: string; label: string; left: number }[] = [];
  for (let i = 0; i < totalDays; i++) {
    const date = addDaysToDateKey(windowStart, i);
    const day = Number(date.slice(8, 10));
    if (day !== 1 && i !== 0) continue;
    const [y, m] = date.split("-").map(Number);
    const label = new Date(Date.UTC(y!, m! - 1, 1, 12, 0, 0)).toLocaleString(
      "en-IN",
      { month: "short", year: "2-digit", timeZone: "UTC" },
    );
    ticks.push({ date, label, left: (i / totalDays) * 100 });
  }
  return ticks;
}

/** Rough quarter markers (Q1=Jan, Q2=Apr, Q3=Jul, Q4=Oct). */
export function quarterTicks(
  windowStart: string,
  totalDays: number,
): { date: string; label: string; left: number }[] {
  const ticks: { date: string; label: string; left: number }[] = [];
  for (let i = 0; i < totalDays; i++) {
    const date = addDaysToDateKey(windowStart, i);
    const [, m, d] = date.split("-").map(Number);
    if (d !== 1) continue;
    if (![1, 4, 7, 10].includes(m!)) continue;
    const q = Math.floor((m! - 1) / 3) + 1;
    const y = date.slice(0, 4);
    ticks.push({
      date,
      label: `Q${q} ’${y.slice(2)}`,
      left: (i / totalDays) * 100,
    });
  }
  return ticks;
}

/** Three ISO weeks from `from` (this / next / +2) for clash overview. */
export function threeWeekPeriods(
  from = new Date(),
  timeZone = DEFAULT_TZ,
): string[] {
  const current = isoWeekPeriod(from, timeZone);
  return [
    current,
    nextIsoWeekPeriod(current),
    nextIsoWeekPeriod(nextIsoWeekPeriod(current)),
  ];
}
