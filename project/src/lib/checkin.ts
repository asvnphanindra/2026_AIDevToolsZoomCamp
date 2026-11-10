import { dateKeyInTz, minutesOf, DEFAULT_TZ } from "@/lib/time";

const STORAGE_KEY = "work-planner.check-ins";

export type CheckInOutcome = "done" | "partly" | "not-done";

export type BlockCheckIn = {
  blockId: string;
  outcome: CheckInOutcome;
  /** Remaining minutes when partly done. */
  remainingMin?: number;
  checkedAt: string;
};

export function readCheckIns(): Record<string, BlockCheckIn> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, BlockCheckIn>;
  } catch {
    return {};
  }
}

export function writeCheckIns(map: Record<string, BlockCheckIn>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function loadCheckIns(): Record<string, BlockCheckIn> {
  if (typeof localStorage === "undefined") return {};
  return readCheckIns();
}

export function upsertCheckIn(
  map: Record<string, BlockCheckIn>,
  entry: BlockCheckIn,
): Record<string, BlockCheckIn> {
  const next = { ...map, [entry.blockId]: entry };
  writeCheckIns(next);
  return next;
}

/** Current HH:mm and YYYY-MM-DD in timezone. */
export function nowParts(
  timeZone = DEFAULT_TZ,
  now = new Date(),
): { date: string; minutes: number } {
  const date = dateKeyInTz(now, timeZone);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return { date, minutes: hour * 60 + minute };
}

/** True when the block's end is strictly in the past (same calendar day or earlier). */
export function isBlockEnded(
  date: string,
  end: string,
  timeZone = DEFAULT_TZ,
  now = new Date(),
): boolean {
  const { date: today, minutes } = nowParts(timeZone, now);
  if (date < today) return true;
  if (date > today) return false;
  return minutesOf(end) <= minutes;
}

export function outcomeLabel(outcome: CheckInOutcome): string {
  if (outcome === "done") return "Done";
  if (outcome === "partly") return "Partly";
  return "Not done";
}
