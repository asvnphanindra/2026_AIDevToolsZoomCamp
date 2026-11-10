import { fictionalSeed, type SeedArea, type SeedTask } from "@/data/fictional-seed";

export type BacklogTask = SeedTask & {
  due?: string;
};

const STORAGE_KEY = "work-planner.backlog-tasks";

export function seedBacklogTasks(): BacklogTask[] {
  return (fictionalSeed.tasks ?? []).map((t) => ({ ...t }));
}

export function readBacklog(): BacklogTask[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BacklogTask[];
  } catch {
    return null;
  }
}

export function writeBacklog(tasks: BacklogTask[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

export function loadBacklog(isDemo: boolean): BacklogTask[] {
  const stored = typeof localStorage !== "undefined" ? readBacklog() : null;
  if (stored && stored.length) return stored;
  return isDemo ? seedBacklogTasks() : [];
}

export function areaName(areas: SeedArea[], areaId: string): string {
  return areas.find((a) => a.id === areaId)?.name ?? areaId;
}

export function areaColour(areas: SeedArea[], areaId: string): string {
  return areas.find((a) => a.id === areaId)?.colour ?? "#666";
}

export function emptyTask(defaultAreaId: string): BacklogTask {
  return {
    id: "",
    title: "",
    areaId: defaultAreaId,
    durationMin: 30,
    priority: "med",
    status: "backlog",
    horizon: "day",
    deepWork: false,
    due: "",
  };
}
