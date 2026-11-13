import {
  fictionalSeed,
  type CalendarEventKind,
  type SeedCalendarSeries,
} from "@/data/fictional-seed";
import { dateKeyInTz, DEFAULT_TZ } from "@/lib/time";

const STORAGE_KEY = "work-planner.calendar-series";

/** Every N weeks from startDate, or every N months on dayOfMonth. */
export type SeriesRule =
  | { freq: "weeks"; interval: number }
  | { freq: "months"; interval: number; dayOfMonth: number };

export type CalendarSeries = {
  id: string;
  label: string;
  kind: CalendarEventKind;
  rule: SeriesRule;
  startDate: string;
  paused: boolean;
  time?: string;
};

/** Occurrence shaped like a calendar event (expand-on-read; not stored). */
export type SeriesOccurrence = {
  id: string;
  date: string;
  kind: CalendarEventKind;
  label: string;
  time?: string;
  seriesId: string;
};

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

function isDateKey(value: unknown): value is string {
  return typeof value === "string" && DATE_KEY_RE.test(value);
}

function addDaysToKey(dateKey: string, offset: number): string {
  if (!isDateKey(dateKey)) return dateKey || "";
  const [y, m, d] = dateKey.split("-").map(Number);
  const utc = new Date(Date.UTC(y!, m! - 1, d!, 12, 0, 0));
  utc.setUTCDate(utc.getUTCDate() + offset);
  return utc.toISOString().slice(0, 10);
}

function addMonthsClamped(
  year: number,
  monthIndex: number,
  day: number,
  deltaMonths: number,
): string {
  const total = monthIndex + deltaMonths;
  const y = year + Math.floor(total / 12);
  const m = ((total % 12) + 12) % 12;
  const dim = new Date(Date.UTC(y, m + 1, 0, 12, 0, 0)).getUTCDate();
  const d = Math.min(day, dim);
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function parseKey(dateKey: string): { y: number; m: number; d: number } {
  if (!isDateKey(dateKey)) {
    return { y: 1970, m: 0, d: 1 };
  }
  const [y, m, d] = dateKey.split("-").map(Number);
  return { y: y!, m: m! - 1, d: d! };
}

function shiftMonth(year: number, monthIndex: number, delta: number) {
  const d = new Date(Date.UTC(year, monthIndex + delta, 1, 12, 0, 0));
  return { year: d.getUTCFullYear(), monthIndex: d.getUTCMonth() };
}

/** Inclusive Calendar window: first day of this month → last day of month+2. */
export function seriesExpandRange(
  from = new Date(),
  timeZone = DEFAULT_TZ,
): { start: string; end: string } {
  const todayKey = dateKeyInTz(from, timeZone);
  const [y, m] = todayKey.split("-").map(Number);
  const year = y!;
  const monthIndex = m! - 1;
  const start = `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`;
  const last = shiftMonth(year, monthIndex, 2);
  const dim = new Date(
    Date.UTC(last.year, last.monthIndex + 1, 0, 12, 0, 0),
  ).getUTCDate();
  const end = `${last.year}-${String(last.monthIndex + 1).padStart(2, "0")}-${String(dim).padStart(2, "0")}`;
  return { start, end };
}

export function describeSeriesRule(rule: SeriesRule): string {
  if (rule.freq === "weeks") {
    const n = rule.interval;
    return n === 1 ? "Every week" : `Every ${n} weeks`;
  }
  const n = rule.interval;
  const day = rule.dayOfMonth;
  return n === 1
    ? `Every month on the ${day}`
    : `Every ${n} months on the ${day}`;
}

export function seedCalendarSeries(
  timeZone = DEFAULT_TZ,
  from = new Date(),
): CalendarSeries[] {
  const todayKey = dateKeyInTz(from, timeZone);
  const raw = (fictionalSeed.series ?? []) as SeedCalendarSeries[];
  return raw.map((s) => ({
    id: s.id,
    label: s.label,
    kind: s.kind,
    rule: s.rule,
    startDate: addDaysToKey(todayKey, s.startDayOffset),
    paused: Boolean(s.paused),
    time: s.time,
  }));
}

export function readCalendarSeries(): CalendarSeries[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CalendarSeries[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeCalendarSeries(series: CalendarSeries[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(series));
}

export function loadCalendarSeries(
  timeZone = DEFAULT_TZ,
  from = new Date(),
): CalendarSeries[] {
  const stored =
    typeof localStorage !== "undefined" ? readCalendarSeries() : null;
  if (stored && stored.length) return stored;
  const seeded = seedCalendarSeries(timeZone, from);
  if (typeof localStorage !== "undefined" && seeded.length) {
    writeCalendarSeries(seeded);
  }
  return seeded;
}

/**
 * Expand one series into dated occurrences in [rangeStart, rangeEnd].
 * Rule only is stored; this is expand-on-read (US-F2).
 */
export function expandSeriesOccurrences(
  series: CalendarSeries,
  rangeStart: string,
  rangeEnd: string,
): SeriesOccurrence[] {
  if (series.paused) return [];
  // Seed/Firestore may still carry startDayOffset without startDate — never crash.
  if (!isDateKey(series.startDate) || !series.rule) return [];
  if (!isDateKey(rangeStart) || !isDateKey(rangeEnd)) return [];
  if (series.startDate > rangeEnd) return [];

  const out: SeriesOccurrence[] = [];
  const windowStart =
    series.startDate > rangeStart ? series.startDate : rangeStart;

  if (series.rule.freq === "weeks") {
    const intervalDays = Math.max(1, series.rule.interval) * 7;
    let cursor = series.startDate;
    while (cursor < windowStart) {
      cursor = addDaysToKey(cursor, intervalDays);
      if (cursor > rangeEnd) return out;
    }
    while (cursor <= rangeEnd) {
      if (cursor >= windowStart) {
        out.push({
          id: `${series.id}@${cursor}`,
          date: cursor,
          kind: series.kind,
          label: series.label,
          time: series.time,
          seriesId: series.id,
        });
      }
      cursor = addDaysToKey(cursor, intervalDays);
    }
    return out;
  }

  const interval = Math.max(1, series.rule.interval);
  const dayOfMonth = Math.min(31, Math.max(1, series.rule.dayOfMonth));
  const start = parseKey(series.startDate);
  let year = start.y;
  let monthIndex = start.m;
  let candidate = addMonthsClamped(year, monthIndex, dayOfMonth, 0);
  if (candidate < series.startDate) {
    candidate = addMonthsClamped(year, monthIndex, dayOfMonth, 1);
    const p = parseKey(candidate);
    year = p.y;
    monthIndex = p.m;
  } else {
    const p = parseKey(candidate);
    year = p.y;
    monthIndex = p.m;
  }

  let n = 0;
  while (n <= 120) {
    const key = addMonthsClamped(year, monthIndex, dayOfMonth, n * interval);
    if (key > rangeEnd) break;
    if (key >= windowStart) {
      out.push({
        id: `${series.id}@${key}`,
        date: key,
        kind: series.kind,
        label: series.label,
        time: series.time,
        seriesId: series.id,
      });
    }
    n += 1;
  }
  return out;
}

/** Expand all series for the 3-month Calendar read window. */
export function expandAllSeries(
  seriesList: CalendarSeries[],
  from = new Date(),
  timeZone = DEFAULT_TZ,
): SeriesOccurrence[] {
  const { start, end } = seriesExpandRange(from, timeZone);
  const events: SeriesOccurrence[] = [];
  for (const s of seriesList) {
    events.push(...expandSeriesOccurrences(s, start, end));
  }
  return events;
}
