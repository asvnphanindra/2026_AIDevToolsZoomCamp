import { formatHhmm, minutesOf } from "@/lib/time";

export type PlacedBlock = {
  id: string;
  taskId: string;
  title: string;
  areaId: string;
  colour: string;
  date: string;
  start: string;
  end: string;
  deepWork?: boolean;
};

export const BLOCK_DRAG_MIME = "application/x-work-planner-block";

const STORAGE_KEY = "work-planner.placed-blocks";

export function readPlacedBlocks(): PlacedBlock[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PlacedBlock[];
  } catch {
    return [];
  }
}

export function writePlacedBlocks(blocks: PlacedBlock[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(blocks));
}

export function addMinutes(hhmm: string, mins: number): string {
  return formatHhmm(minutesOf(hhmm) + mins);
}

export function durationMinutes(start: string, end: string): number {
  return Math.max(0, minutesOf(end) - minutesOf(start));
}

export type TimedItem = {
  id: string;
  date: string;
  start: string;
  end: string;
  title: string;
  kind: string;
};

export function findConflicts(
  candidate: { id?: string; date: string; start: string; end: string },
  items: TimedItem[],
): TimedItem[] {
  return items.filter(
    (item) =>
      item.id !== candidate.id &&
      item.date === candidate.date &&
      minutesOf(candidate.start) < minutesOf(item.end) &&
      minutesOf(candidate.end) > minutesOf(item.start),
  );
}

/** Snap minutes to 15-min grid within [startHour, endHour). */
export function snapMinutes(
  totalMins: number,
  startHour: number,
  endHour: number,
): number {
  const lo = startHour * 60;
  const hi = endHour * 60;
  let m = Math.round(totalMins / 15) * 15;
  m = Math.min(Math.max(m, lo), hi - 15);
  return m;
}
