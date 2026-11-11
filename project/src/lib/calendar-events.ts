import {
  fictionalSeed,
  type CalendarEventKind,
  type SeedCalendarEvent,
} from "@/data/fictional-seed";
import { isoWeekPeriod } from "@/lib/goals";
import { dateKeyInTz, DEFAULT_TZ } from "@/lib/time";
import { dayKeysForIsoWeek } from "@/lib/week-horizon";

const STORAGE_KEY = "work-planner.calendar-events";

export type CalendarEvent = {
  id: string;
  date: string;
  endDate?: string;
  kind: CalendarEventKind;
  label: string;
  time?: string;
  seriesId?: string;
};

export const EVENT_KIND_LABELS: Record<CalendarEventKind, string> = {
  deadline: "Deadline",
  exam: "Exam",
  appointment: "Appointment",
  series: "Series",
};

/** Marker colours by event kind (US-F1). */
export const EVENT_KIND_COLOURS: Record<CalendarEventKind, string> = {
  deadline: "#C45C26",
  exam: "#B33A3A",
  appointment: "#0F6B4C",
  series: "#3D7EA6",
};

export type MonthGrid = {
  /** `YYYY-MM` */
  key: string;
  label: string;
  year: number;
  monthIndex: number;
  /** Sunday-first padded weeks; null = empty pad cell. */
  weeks: (string | null)[][];
};

function addDaysToKey(dateKey: string, offset: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const utc = new Date(Date.UTC(y!, m! - 1, d!, 12, 0, 0));
  utc.setUTCDate(utc.getUTCDate() + offset);
  return utc.toISOString().slice(0, 10);
}

function monthParts(
  from = new Date(),
  timeZone = DEFAULT_TZ,
): { year: number; monthIndex: number; todayKey: string } {
  const todayKey = dateKeyInTz(from, timeZone);
  const [y, m] = todayKey.split("-").map(Number);
  return { year: y!, monthIndex: m! - 1, todayKey };
}

function shiftMonth(year: number, monthIndex: number, delta: number) {
  const d = new Date(Date.UTC(year, monthIndex + delta, 1, 12, 0, 0));
  return { year: d.getUTCFullYear(), monthIndex: d.getUTCMonth() };
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0, 12, 0, 0)).getUTCDate();
}

/** Build Mon-first week rows for one calendar month. */
function buildMonthWeeks(year: number, monthIndex: number): (string | null)[][] {
  const dim = daysInMonth(year, monthIndex);
  // weekdaySun0: Sun=0 … Sat=6 → Mon-first pad
  const firstUtc = new Date(Date.UTC(year, monthIndex, 1, 12, 0, 0));
  const sun0 = firstUtc.getUTCDay();
  const monFirstPad = (sun0 + 6) % 7;
  const cells: (string | null)[] = [];
  for (let i = 0; i < monFirstPad; i++) cells.push(null);
  for (let day = 1; day <= dim; day++) {
    cells.push(
      `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    );
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

/** Current month + next two (`YYYY-MM` headers). */
export function threeMonthGrids(
  from = new Date(),
  timeZone = DEFAULT_TZ,
): MonthGrid[] {
  const { year, monthIndex } = monthParts(from, timeZone);
  const grids: MonthGrid[] = [];
  for (let i = 0; i < 3; i++) {
    const m = shiftMonth(year, monthIndex, i);
    const key = `${m.year}-${String(m.monthIndex + 1).padStart(2, "0")}`;
    const label = new Intl.DateTimeFormat("en-IN", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(m.year, m.monthIndex, 1, 12, 0, 0)));
    grids.push({
      key,
      label,
      year: m.year,
      monthIndex: m.monthIndex,
      weeks: buildMonthWeeks(m.year, m.monthIndex),
    });
  }
  return grids;
}

/** Mon–Sun date keys for the ISO week containing `from`. */
export function currentWeekDayKeys(
  from = new Date(),
  timeZone = DEFAULT_TZ,
): string[] {
  return dayKeysForIsoWeek(isoWeekPeriod(from, timeZone), timeZone);
}

export function seedCalendarEvents(
  timeZone = DEFAULT_TZ,
  from = new Date(),
): CalendarEvent[] {
  const todayKey = dateKeyInTz(from, timeZone);
  const raw = (fictionalSeed.events ?? []) as SeedCalendarEvent[];
  return raw.map((e) => ({
    id: e.id,
    date: addDaysToKey(todayKey, e.dayOffset),
    endDate:
      e.endDayOffset !== undefined
        ? addDaysToKey(todayKey, e.endDayOffset)
        : undefined,
    kind: e.kind,
    label: e.label,
    time: e.time,
    seriesId: e.seriesId,
  }));
}

export function readCalendarEvents(): CalendarEvent[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CalendarEvent[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeCalendarEvents(events: CalendarEvent[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

export function loadCalendarEvents(
  timeZone = DEFAULT_TZ,
  from = new Date(),
): CalendarEvent[] {
  const stored =
    typeof localStorage !== "undefined" ? readCalendarEvents() : null;
  if (stored && stored.length) return stored;
  const seeded = seedCalendarEvents(timeZone, from);
  if (typeof localStorage !== "undefined" && seeded.length) {
    writeCalendarEvents(seeded);
  }
  return seeded;
}

export function eventsOnDate(
  events: CalendarEvent[],
  dateKey: string,
): CalendarEvent[] {
  return events.filter((e) => {
    if (e.endDate) return dateKey >= e.date && dateKey <= e.endDate;
    return e.date === dateKey;
  });
}

/** Upcoming from today forward, ordered by date then time. */
export function upcomingEvents(
  events: CalendarEvent[],
  from = new Date(),
  timeZone = DEFAULT_TZ,
): CalendarEvent[] {
  const todayKey = dateKeyInTz(from, timeZone);
  return events
    .filter((e) => (e.endDate ?? e.date) >= todayKey)
    .sort((a, b) => {
      const byDate = a.date.localeCompare(b.date);
      if (byDate !== 0) return byDate;
      return (a.time ?? "99:99").localeCompare(b.time ?? "99:99");
    });
}
