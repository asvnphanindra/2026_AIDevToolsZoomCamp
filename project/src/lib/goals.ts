import { fictionalSeed, type SeedGoal } from "@/data/fictional-seed";
import { dateKeyInTz, DEFAULT_TZ } from "@/lib/time";

const STORAGE_KEY = "work-planner.goals";

export type WeeklyGoal = SeedGoal;

/** ISO week period `YYYY-Www` for a calendar instant in `timeZone`. */
export function isoWeekPeriod(
  from = new Date(),
  timeZone = DEFAULT_TZ,
): string {
  const key = dateKeyInTz(from, timeZone);
  const [y, m, d] = key.split("-").map(Number);
  // Thursday of this ISO week determines the ISO year/week.
  const utc = new Date(Date.UTC(y!, m! - 1, d!, 12, 0, 0));
  const day = utc.getUTCDay() || 7; // Mon=1 … Sun=7
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const isoYear = utc.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1, 12, 0, 0));
  const week = Math.ceil(
    ((utc.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  );
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}

/** Next ISO week after `period` (`YYYY-Www`). */
export function nextIsoWeekPeriod(period: string): string {
  const match = /^(\d{4})-W(\d{2})$/.exec(period);
  if (!match) throw new Error(`Invalid ISO week period: ${period}`);
  const year = Number(match[1]);
  const week = Number(match[2]);
  // ISO week: Thursday of week 1 is Jan 4-ish; use Mon of target week + 7.
  const jan4 = new Date(Date.UTC(year, 0, 4, 12, 0, 0));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Mon = new Date(jan4);
  week1Mon.setUTCDate(jan4.getUTCDate() - (jan4Day - 1));
  const targetMon = new Date(week1Mon);
  targetMon.setUTCDate(week1Mon.getUTCDate() + (week - 1) * 7 + 7);
  return isoWeekPeriod(targetMon, "UTC");
}

export function previousIsoWeekPeriod(period: string): string {
  const match = /^(\d{4})-W(\d{2})$/.exec(period);
  if (!match) throw new Error(`Invalid ISO week period: ${period}`);
  const year = Number(match[1]);
  const week = Number(match[2]);
  const jan4 = new Date(Date.UTC(year, 0, 4, 12, 0, 0));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Mon = new Date(jan4);
  week1Mon.setUTCDate(jan4.getUTCDate() - (jan4Day - 1));
  const targetMon = new Date(week1Mon);
  targetMon.setUTCDate(week1Mon.getUTCDate() + (week - 1) * 7 - 7);
  return isoWeekPeriod(targetMon, "UTC");
}

export function seedWeeklyGoals(
  timeZone = DEFAULT_TZ,
  from = new Date(),
): WeeklyGoal[] {
  const current = isoWeekPeriod(from, timeZone);
  return (fictionalSeed.goals ?? [])
    .filter((g) => g.horizon === "week")
    .map((g) => ({
      ...g,
      period: g.period === "CURRENT" ? current : g.period,
      starred: g.starred !== false,
      progress: Math.max(0, Math.min(100, g.progress ?? 0)),
    }));
}

export function readGoals(): WeeklyGoal[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WeeklyGoal[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeGoals(goals: WeeklyGoal[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
}

export function loadGoals(timeZone = DEFAULT_TZ): WeeklyGoal[] {
  const stored =
    typeof localStorage !== "undefined" ? readGoals() : null;
  if (stored && stored.length) return stored;
  const seeded = seedWeeklyGoals(timeZone);
  if (typeof localStorage !== "undefined" && seeded.length) {
    writeGoals(seeded);
  }
  return seeded;
}

export function nextGoalId(goals: WeeklyGoal[]): string {
  const base = `goal-${Date.now().toString(36)}`;
  if (!goals.some((g) => g.id === base)) return base;
  return `${base}-${goals.length + 1}`;
}

export function goalsForWeek(
  goals: WeeklyGoal[],
  period: string,
  areaId?: string,
): WeeklyGoal[] {
  return goals
    .filter(
      (g) =>
        g.horizon === "week" &&
        g.period === period &&
        (areaId ? g.areaId === areaId : true),
    )
    .sort((a, b) => {
      if (a.starred !== b.starred) return a.starred ? -1 : 1;
      return a.title.localeCompare(b.title);
    });
}

export function isUnfinished(goal: WeeklyGoal): boolean {
  return (goal.progress ?? 0) < 100;
}

/**
 * Copy unfinished goals from `fromPeriod` into `toPeriod` (default: next ISO week).
 * Skips titles already present in the target week+area. Returns updated list + count.
 */
export function carryOverUnfinished(
  goals: WeeklyGoal[],
  fromPeriod: string,
  toPeriod = nextIsoWeekPeriod(fromPeriod),
): { goals: WeeklyGoal[]; carried: number } {
  const unfinished = goals.filter(
    (g) =>
      g.horizon === "week" &&
      g.period === fromPeriod &&
      isUnfinished(g),
  );
  if (!unfinished.length) return { goals, carried: 0 };

  const existingKeys = new Set(
    goals
      .filter((g) => g.horizon === "week" && g.period === toPeriod)
      .map((g) => `${g.areaId}::${g.title.toLowerCase()}`),
  );

  const additions: WeeklyGoal[] = [];
  let seq = 0;
  for (const g of unfinished) {
    const key = `${g.areaId}::${g.title.toLowerCase()}`;
    if (existingKeys.has(key)) continue;
    existingKeys.add(key);
    seq += 1;
    additions.push({
      ...g,
      id: `goal-carry-${Date.now().toString(36)}-${seq}`,
      period: toPeriod,
      progress: 0,
      starred: true,
    });
  }

  return {
    goals: [...goals, ...additions],
    carried: additions.length,
  };
}
