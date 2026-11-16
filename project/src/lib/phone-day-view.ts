/** Phone Today surface: list agenda vs hourly grid. */

export type PhoneDayView = "agenda" | "grid";

export const DEFAULT_PHONE_DAY_VIEW: PhoneDayView = "grid";

const STORAGE_KEY = "work-planner.phone-day-view";

function isPhoneDayView(value: unknown): value is PhoneDayView {
  return value === "agenda" || value === "grid";
}

export function readPhoneDayView(): PhoneDayView | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isPhoneDayView(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writePhoneDayView(view: PhoneDayView): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(view));
}

export function loadPhoneDayView(): PhoneDayView {
  if (typeof localStorage === "undefined") return DEFAULT_PHONE_DAY_VIEW;
  return readPhoneDayView() ?? DEFAULT_PHONE_DAY_VIEW;
}
