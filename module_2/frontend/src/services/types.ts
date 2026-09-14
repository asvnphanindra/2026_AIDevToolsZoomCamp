/** Domain types shared by the whole app. */

export type CardStatus = "todo" | "in_progress" | "completed";

export const CARD_STATUSES: CardStatus[] = ["todo", "in_progress", "completed"];

export const STATUS_LABELS: Record<CardStatus, string> = {
  todo: "Todo",
  in_progress: "In Progress",
  completed: "Completed",
};

/** Timetable slot: day 0 = Monday .. 6 = Sunday, hour in 6..23. */
export interface Slot {
  day: number;
  hour: number;
}

export interface Project {
  id: string;
  name: string;
  /** Index into the project palette, used for the card accent. */
  colorIndex: number;
}

export interface Card {
  id: string;
  projectId: string;
  title: string;
  status: CardStatus;
  /** null when the card sits in the task grid. */
  slot: Slot | null;
}

export interface BoardSettings {
  /** ISO date (yyyy-mm-dd) used to label the Monday column. Display only. */
  mondayDate: string | null;
}

export interface Board {
  projects: Project[];
  cards: Card[];
  settings: BoardSettings;
}

export const FIRST_HOUR = 6;
export const LAST_HOUR = 23;
export const HOURS: number[] = Array.from(
  { length: LAST_HOUR - FIRST_HOUR + 1 },
  (_, i) => FIRST_HOUR + i,
);
export const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export function slotKey(slot: Slot): string {
  return `${slot.day}-${slot.hour}`;
}
