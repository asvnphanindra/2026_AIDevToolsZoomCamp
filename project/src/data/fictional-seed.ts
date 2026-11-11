import raw from "../../seed/demo/fictional.json";

export type SeedArea = {
  id: string;
  name: string;
  colour: string;
  order: number;
};

export type EnergyLevel = "high" | "medium" | "low";

export type SeedBand = {
  id: string;
  level: EnergyLevel;
  start: string;
  end: string;
  weekdays: number[];
};

export type SeedTask = {
  id: string;
  title: string;
  areaId: string;
  durationMin: number;
  priority: string;
  status: string;
  horizon: string;
  deepWork?: boolean;
  /** ISO week `YYYY-Www` when horizon is week (this week’s backlog). */
  period?: string;
  /** Planner Goals Gantt id when created from a goal. */
  goalId?: string;
};

export type SeedProfile = {
  displayName: string;
  timezone: string;
  settings: {
    gridStartHour: number;
    gridEndHour: number;
    reminderMinutes: number;
  };
};

export type SeedRoutine = {
  id: string;
  label: string;
  start: string;
  end: string;
  weekdays: number[];
};

/** Drag-to-place templates (instances; template remains). */
export type SeedRepeatingTask = {
  id: string;
  title: string;
  areaId: string;
  durationMin: number;
  deepWork?: boolean;
};

export type SeedSchedule = {
  id: string;
  title: string;
  start: string;
  end: string;
  weekday: number;
  kind: string;
  location?: string;
};

export type DayTypeKind =
  | "normal"
  | "holiday"
  | "no-fixed-schedule"
  | "online"
  | "exam";

export type OnlineSlot = {
  title: string;
  start: string;
  end: string;
};

export type SeedDayType = {
  dayOffset: number;
  type: DayTypeKind;
  label: string;
  onlineSlots?: OnlineSlot[];
};

export type ScheduleChangeKind = "substitute" | "extra" | "cancel";

/** One-off change for a single date (US-B5). dayOffset relative to today. */
export type SeedScheduleChange = {
  id: string;
  dayOffset: number;
  kind: ScheduleChangeKind;
  title: string;
  start: string;
  end: string;
};

export type SeedBlock = {
  id: string;
  title: string;
  areaId: string;
  dayOffset: number;
  start: string;
  end: string;
  deepWork?: boolean;
};

/** Daily minimum (US-C3). */
export type SeedRule = {
  id: string;
  areaId: string;
  minMinutesPerDay: number;
  label?: string;
};

/** Standing focus item (US-E1). */
export type SeedFocusItem = {
  id: string;
  areaId: string;
  title: string;
  subtitle?: string;
  order: number;
};

/** Goal (US-E2 weekly; later month/quarter). */
export type SeedGoal = {
  id: string;
  horizon: "week" | "month" | "quarter";
  /** ISO week `YYYY-Www`, month `YYYY-MM`, or quarter `YYYY-Qn`; seed may use `CURRENT`. */
  period: string;
  areaId: string;
  title: string;
  starred: boolean;
  progress: number;
  parentId?: string;
};

/** 3-week horizon item (US-E3); resolved against current ISO week at load. */
export type SeedWeekHorizonItem = {
  id: string;
  title: string;
  areaId: string;
  /** 0 = this week, 1 = next, 2 = week after. */
  weekOffset: number;
  placement: "day" | "week";
  /** Mon=0 … Sun=6 within that ISO week when placement is day. */
  dayIndex?: number;
  done?: boolean;
};

/**
 * Planner Goals Gantt item. Offsets are relative to “today” at seed load.
 * Horizons: short ~3w, mid ~3m, long ~3q.
 */
export type SeedAreaGoal = {
  id: string;
  areaId: string;
  title: string;
  horizon: "short" | "mid" | "long";
  startOffsetDays: number;
  endOffsetDays: number;
  progress?: number;
};

export type FictionalSeed = {
  profile: SeedProfile;
  areas: SeedArea[];
  bands: SeedBand[];
  tasks: SeedTask[];
  routines: SeedRoutine[];
  repeatingTasks?: SeedRepeatingTask[];
  schedule: SeedSchedule[];
  /** Legacy seed field; one-off punch-holes no longer applied in UI. */
  scheduleChanges?: SeedScheduleChange[];
  dayTypes: SeedDayType[];
  blocks: SeedBlock[];
  rules: SeedRule[];
  focusItems?: SeedFocusItem[];
  goals?: SeedGoal[];
  weekHorizon?: SeedWeekHorizonItem[];
  areaGoals?: SeedAreaGoal[];
};

/** Fictional demo payload only — never commit personal seeds. */
export const fictionalSeed = raw as FictionalSeed;

export const BAND_COLOURS: Record<EnergyLevel, string> = {
  high: "#7BC47F",
  medium: "#E0C36A",
  low: "#C98B8B",
};

export const DAY_TYPE_LABELS: Record<DayTypeKind, string> = {
  normal: "Normal",
  holiday: "Holiday",
  "no-fixed-schedule": "No fixed schedule",
  online: "Online",
  exam: "Exam",
};
