/** Scheduler calendar layer modes: Combined (all) or one exclusive layer. */

export type SchedulerLayerId =
  | "availability"
  | "recurring"
  | "scheduled"
  | "focus";

export type SchedulerLayerMode = "combined" | SchedulerLayerId;

export type SchedulerLayerState = Record<SchedulerLayerId, boolean>;

export const SCHEDULER_LAYER_IDS: SchedulerLayerId[] = [
  "availability",
  "recurring",
  "scheduled",
  "focus",
];

/** Modes offered as exclusive checkboxes (Combined OR a single layer). */
export const SCHEDULER_LAYER_MODES: SchedulerLayerMode[] = [
  "combined",
  ...SCHEDULER_LAYER_IDS,
];

export const SCHEDULER_LAYER_MODE_LABELS: Record<SchedulerLayerMode, string> = {
  combined: "Combined",
  availability: "Availability",
  recurring: "Recurring",
  scheduled: "Scheduled work",
  focus: "Focus",
};

/** @deprecated Prefer SCHEDULER_LAYER_MODE_LABELS / SCHEDULER_LAYER_IDS. */
export const SCHEDULER_LAYER_ORDER = SCHEDULER_LAYER_IDS;

/** @deprecated Prefer SCHEDULER_LAYER_MODE_LABELS. */
export const SCHEDULER_LAYER_LABELS: Record<SchedulerLayerId, string> = {
  availability: "Availability",
  recurring: "Recurring",
  scheduled: "Scheduled work",
  focus: "Focus",
};

export const DEFAULT_SCHEDULER_LAYER_MODE: SchedulerLayerMode = "combined";

/**
 * Derived boolean map for Combined / single-layer visibility.
 *
 * Focus mode shows drag-dropped (scheduled) blocks on the grid only —
 * unscheduled work stays in the Tasks to Focus side panel until placed.
 * Standing FocusPanel strips are not painted onto the calendar.
 */
export function layerStateForMode(mode: SchedulerLayerMode): SchedulerLayerState {
  if (mode === "combined") {
    return {
      availability: true,
      recurring: true,
      scheduled: true,
      focus: false,
    };
  }
  if (mode === "focus") {
    return {
      availability: false,
      recurring: false,
      scheduled: true,
      focus: false,
    };
  }
  return {
    availability: mode === "availability",
    recurring: mode === "recurring",
    scheduled: mode === "scheduled",
    focus: false,
  };
}

/** Side “Tasks to Focus” panel is only for the Focus layer. */
export function showsTasksToFocus(mode: SchedulerLayerMode): boolean {
  return mode === "focus";
}

const STORAGE_KEY = "work-planner.scheduler-layer-mode";
const LEGACY_STORAGE_KEY = "work-planner.scheduler-layers";

function isLayerMode(value: unknown): value is SchedulerLayerMode {
  return (
    value === "combined" ||
    value === "availability" ||
    value === "recurring" ||
    value === "scheduled" ||
    value === "focus"
  );
}

/** Infer exclusive/Combined mode from a legacy multi-select layer map. */
export function modeFromLegacyLayers(
  layers: Partial<SchedulerLayerState>,
): SchedulerLayerMode {
  const on = SCHEDULER_LAYER_IDS.filter((id) => layers[id] === true);
  if (on.length === 0 || on.length === SCHEDULER_LAYER_IDS.length) {
    return "combined";
  }
  if (on.length === 1) return on[0]!;
  return "combined";
}

export function readSchedulerLayerMode(): SchedulerLayerMode | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (isLayerMode(parsed)) return parsed;
      if (
        parsed &&
        typeof parsed === "object" &&
        isLayerMode((parsed as { mode?: unknown }).mode)
      ) {
        return (parsed as { mode: SchedulerLayerMode }).mode;
      }
    }
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacyRaw) return null;
    const legacy = JSON.parse(legacyRaw) as Partial<SchedulerLayerState>;
    if (!legacy || typeof legacy !== "object") return null;
    return modeFromLegacyLayers(legacy);
  } catch {
    return null;
  }
}

export function writeSchedulerLayerMode(mode: SchedulerLayerMode): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mode));
}

export function loadSchedulerLayerMode(): SchedulerLayerMode {
  if (typeof localStorage === "undefined") {
    return DEFAULT_SCHEDULER_LAYER_MODE;
  }
  return readSchedulerLayerMode() ?? DEFAULT_SCHEDULER_LAYER_MODE;
}

/** @deprecated Use loadSchedulerLayerMode + layerStateForMode. */
export const DEFAULT_SCHEDULER_LAYERS: SchedulerLayerState =
  layerStateForMode(DEFAULT_SCHEDULER_LAYER_MODE);

/** @deprecated Use loadSchedulerLayerMode. */
export function readSchedulerLayers(): SchedulerLayerState | null {
  const mode = readSchedulerLayerMode();
  return mode ? layerStateForMode(mode) : null;
}

/** @deprecated Use writeSchedulerLayerMode. */
export function writeSchedulerLayers(state: SchedulerLayerState): void {
  writeSchedulerLayerMode(modeFromLegacyLayers(state));
}

/** @deprecated Use loadSchedulerLayerMode + layerStateForMode. */
export function loadSchedulerLayers(): SchedulerLayerState {
  return layerStateForMode(loadSchedulerLayerMode());
}
