const DEFAULT_TZ = "Asia/Kolkata";

/** Calendar YYYY-MM-DD in the given IANA timezone. */
export function dateKeyInTz(date: Date, timeZone = DEFAULT_TZ): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Today + next `count-1` days as YYYY-MM-DD keys in TZ. */
export function nextDayKeys(
  count: number,
  timeZone = DEFAULT_TZ,
  from = new Date(),
): string[] {
  const keys: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(from.getTime() + i * 86_400_000);
    keys.push(dateKeyInTz(d, timeZone));
  }
  // Deduplicate DST edge by walking calendar via noon UTC offset retry if needed.
  if (new Set(keys).size === count) return keys;
  const out: string[] = [];
  let cursor = new Date(from);
  while (out.length < count) {
    const key = dateKeyInTz(cursor, timeZone);
    if (!out.includes(key)) out.push(key);
    cursor = new Date(cursor.getTime() + 86_400_000);
  }
  return out;
}

export function weekdaySun0(dateKey: string, timeZone = DEFAULT_TZ): number {
  // Parse as local noon in TZ via formatter parts.
  const [y, m, d] = dateKey.split("-").map(Number);
  const utcGuess = new Date(Date.UTC(y!, m! - 1, d!, 12, 0, 0));
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(utcGuess);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[weekday] ?? 0;
}

export function formatDayLabel(dateKey: string, timeZone = DEFAULT_TZ): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const utcGuess = new Date(Date.UTC(y!, m! - 1, d!, 12, 0, 0));
  return new Intl.DateTimeFormat("en-IN", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(utcGuess);
}

export function formatLastUpdated(
  date: Date,
  timeZone = DEFAULT_TZ,
): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/** Minutes from midnight for HH:mm. */
export function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function buildHalfHourSlots(
  startHour: number,
  endHour: number,
): string[] {
  const slots: string[] = [];
  for (let mins = startHour * 60; mins < endHour * 60; mins += 30) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  return slots;
}

export { DEFAULT_TZ };
