import { fictionalSeed, type SeedFocusItem } from "@/data/fictional-seed";

const STORAGE_KEY = "work-planner.focus-items";

export type FocusItem = SeedFocusItem;

export function seedFocusItems(): FocusItem[] {
  return (fictionalSeed.focusItems ?? []).map((f) => ({ ...f }));
}

export function readFocusItems(): FocusItem[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FocusItem[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeFocusItems(items: FocusItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function loadFocusItems(): FocusItem[] {
  const stored =
    typeof localStorage !== "undefined" ? readFocusItems() : null;
  if (stored && stored.length) return stored;
  const seeded = seedFocusItems();
  if (typeof localStorage !== "undefined" && seeded.length) {
    writeFocusItems(seeded);
  }
  return seeded;
}

export function nextFocusId(items: FocusItem[]): string {
  const base = `focus-${Date.now().toString(36)}`;
  if (!items.some((i) => i.id === base)) return base;
  return `${base}-${items.length + 1}`;
}

export function itemsForArea(items: FocusItem[], areaId: string): FocusItem[] {
  return items
    .filter((i) => i.areaId === areaId)
    .sort((a, b) => a.order - b.order);
}
