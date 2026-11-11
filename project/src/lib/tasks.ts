import { fictionalSeed, type SeedArea, type SeedTask } from "@/data/fictional-seed";
import type { AreaGoal } from "@/lib/area-goals";
import { isoWeekPeriod } from "@/lib/goals";
import { DEFAULT_TZ } from "@/lib/time";

export type BacklogTask = SeedTask & {
  due?: string;
  /** US-D2 — returned from unfinished check-in. */
  replan?: boolean;
};

export const TASK_DRAG_MIME = "application/x-work-planner-task";

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

/** Open backlog card already linked to this goal for the given ISO week. */
export function openBacklogForGoalWeek(
  tasks: BacklogTask[],
  goalId: string,
  period: string,
): BacklogTask | undefined {
  return tasks.find(
    (t) =>
      t.status === "backlog" &&
      t.goalId === goalId &&
      t.period === period,
  );
}

/** Build a this-week Scheduler backlog card from a Planner Goals Gantt goal. */
export function backlogTaskFromAreaGoal(
  goal: AreaGoal,
  options?: {
    timezone?: string;
    from?: Date;
    durationMin?: number;
  },
): BacklogTask {
  const timezone = options?.timezone ?? DEFAULT_TZ;
  const from = options?.from ?? new Date();
  const period = isoWeekPeriod(from, timezone);
  return {
    id: `task-goal-${goal.id}-${period}`,
    title: goal.title,
    areaId: goal.areaId,
    durationMin: Math.max(5, options?.durationMin ?? 60),
    priority: "med",
    status: "backlog",
    horizon: "week",
    period,
    goalId: goal.id,
    deepWork: false,
  };
}
