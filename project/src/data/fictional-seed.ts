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

export type SeedBlock = {
  id: string;
  title: string;
  areaId: string;
  dayOffset: number;
  start: string;
  end: string;
  deepWork?: boolean;
};

export type FictionalSeed = {
  profile: SeedProfile;
  areas: SeedArea[];
  bands: SeedBand[];
  tasks: SeedTask[];
  routines: SeedRoutine[];
  schedule: SeedSchedule[];
  dayTypes: SeedDayType[];
  blocks: SeedBlock[];
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
