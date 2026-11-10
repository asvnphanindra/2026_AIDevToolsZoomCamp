import {
  fictionalSeed,
  type SeedRepeatingTask,
} from "@/data/fictional-seed";

export type RepeatingTask = SeedRepeatingTask;

export const REPEAT_DRAG_MIME = "application/x-work-planner-repeat";

const FALLBACK: RepeatingTask[] = [
  {
    id: "rep-standup-notes",
    title: "Standup notes",
    areaId: "work",
    durationMin: 20,
  },
  {
    id: "rep-deep-focus",
    title: "Deep focus block",
    areaId: "work",
    durationMin: 90,
    deepWork: true,
  },
  {
    id: "rep-guitar",
    title: "Guitar practice",
    areaId: "passion",
    durationMin: 30,
  },
  {
    id: "rep-chapter",
    title: "Study chapter",
    areaId: "study",
    durationMin: 45,
    deepWork: true,
  },
];

/** Seeded repeating templates (place instances; templates stay). */
export function seedRepeatingTasks(): RepeatingTask[] {
  const fromSeed = fictionalSeed.repeatingTasks;
  if (fromSeed?.length) return fromSeed.map((t) => ({ ...t }));
  return FALLBACK.map((t) => ({ ...t }));
}
