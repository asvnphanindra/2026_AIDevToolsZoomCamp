import type { SetupTemplate } from "@/data/templates/types";

/** Blank — user-defined; no preset areas, bands, or schedule. */
export const blankTemplate: SetupTemplate = {
  id: "blank",
  name: "Blank",
  description: "Start empty. Add your own areas, bands, and schedule.",
  areas: [],
  bands: [],
  routines: [],
  schedule: [],
  rules: [],
  series: [],
  settings: {
    timezone: "Asia/Kolkata",
    gridStartHour: 6,
    gridEndHour: 22,
    daysVisible: 5,
    checkInCadence: "after-block",
    reminderDefaultMin: 60,
  },
};
