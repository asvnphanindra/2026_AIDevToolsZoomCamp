/** Stackable Scheduler calendar layers (vision: Availability → Recurring → Scheduled → Focus). */

export type SchedulerLayerId =
  | "availability"
  | "recurring"
  | "scheduled"
  | "focus";

export type SchedulerLayerState = Record<SchedulerLayerId, boolean>;

export const SCHEDULER_LAYER_ORDER: SchedulerLayerId[] = [
  "availability",
  "recurring",
  "scheduled",
  "focus",
];

export const SCHEDULER_LAYER_LABELS: Record<SchedulerLayerId, string> = {
  availability: "Availability",
  recurring: "Recurring",
  scheduled: "Scheduled work",
  focus: "Focus",
};

/** All layers on; Focus defaults on per vision. */
export const DEFAULT_SCHEDULER_LAYERS: SchedulerLayerState = {
  availability: true,
  recurring: true,
  scheduled: true,
  focus: true,
};

const STORAGE_KEY = "work-planner.scheduler-layers";

export function readSchedulerLayers(): SchedulerLayerState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SchedulerLayerState>;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      availability:
        typeof parsed.availability === "boolean"
          ? parsed.availability
          : DEFAULT_SCHEDULER_LAYERS.availability,
      recurring:
        typeof parsed.recurring === "boolean"
          ? parsed.recurring
          : DEFAULT_SCHEDULER_LAYERS.recurring,
      scheduled:
        typeof parsed.scheduled === "boolean"
          ? parsed.scheduled
          : DEFAULT_SCHEDULER_LAYERS.scheduled,
      focus:
        typeof parsed.focus === "boolean"
          ? parsed.focus
          : DEFAULT_SCHEDULER_LAYERS.focus,
    };
  } catch {
    return null;
  }
}

export function writeSchedulerLayers(state: SchedulerLayerState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadSchedulerLayers(): SchedulerLayerState {
  if (typeof localStorage === "undefined") return { ...DEFAULT_SCHEDULER_LAYERS };
  return readSchedulerLayers() ?? { ...DEFAULT_SCHEDULER_LAYERS };
}
