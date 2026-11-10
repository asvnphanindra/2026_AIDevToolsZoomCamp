import { fictionalSeed, type SeedArea } from "@/data/fictional-seed";

const STORAGE_KEY = "work-planner.areas";

export function seedAreas(): SeedArea[] {
  return fictionalSeed.areas.map((a) => ({ ...a }));
}

export function readAreas(): SeedArea[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SeedArea[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeAreas(areas: SeedArea[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(areas));
}

export function loadAreas(fallback?: SeedArea[]): SeedArea[] {
  const stored = typeof localStorage !== "undefined" ? readAreas() : null;
  if (stored && stored.length) return stored;
  const seeded = fallback?.length ? fallback.map((a) => ({ ...a })) : seedAreas();
  if (typeof localStorage !== "undefined") writeAreas(seeded);
  return seeded;
}

export function nextAreaId(areas: SeedArea[]): string {
  const base = `area-${Date.now().toString(36)}`;
  if (!areas.some((a) => a.id === base)) return base;
  return `${base}-${areas.length + 1}`;
}

export const DEFAULT_AREA_COLOURS = [
  "#0F6B4C",
  "#1D4E89",
  "#A15C07",
  "#7A3E9D",
  "#8B3A3A",
  "#2F6F6A",
];
