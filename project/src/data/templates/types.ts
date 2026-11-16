import type {
  SeedArea,
  SeedBand,
  SeedRoutine,
  SeedRule,
  SeedSchedule,
} from "@/data/fictional-seed";
import type { UserSettings } from "@/lib/config";
import type { SeriesRule } from "@/lib/calendar-series";

/** Recurring item in a template (absolute start via startDayOffset at apply). */
export type TemplateSeries = {
  id: string;
  label: string;
  kind: "deadline" | "exam" | "appointment" | "series";
  rule: SeriesRule;
  startDayOffset: number;
  paused?: boolean;
  time?: string;
};

export type SetupTemplateId =
  | "teacher-phd"
  | "student"
  | "office"
  | "blank";

/** Typed fictional setup template (config only — no personal markers). */
export type SetupTemplate = {
  id: SetupTemplateId;
  name: string;
  description: string;
  areas: SeedArea[];
  bands: SeedBand[];
  /** Commute / low-focus slots (stored as routines). */
  routines: SeedRoutine[];
  schedule: SeedSchedule[];
  rules: SeedRule[];
  series: TemplateSeries[];
  settings: Partial<UserSettings>;
};
