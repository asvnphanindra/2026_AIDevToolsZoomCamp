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

export type FictionalSeed = {
  profile: SeedProfile;
  areas: SeedArea[];
  bands: SeedBand[];
  tasks: SeedTask[];
  routines: SeedRoutine[];
  repeatingTasks?: SeedRepeatingTask[];
  schedule: SeedSchedule[];
  scheduleChanges: SeedScheduleChange[];
  dayTypes: SeedDayType[];
  blocks: SeedBlock[];
  rules: SeedRule[];
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
