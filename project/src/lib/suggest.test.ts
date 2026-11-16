import { describe, expect, it } from "vitest";
import { buildDayGrid } from "@/lib/day-grid";
import type { DailyRule } from "@/lib/rules";
import { suggestFor } from "@/lib/suggest";
import { minutesOf } from "@/lib/time";

const bands = [
  {
    id: "h",
    level: "high" as const,
    start: "07:00",
    end: "12:00",
    weekdays: [0, 1, 2, 3, 4, 5, 6],
  },
  {
    id: "m",
    level: "medium" as const,
    start: "13:00",
    end: "16:00",
    weekdays: [0, 1, 2, 3, 4, 5, 6],
  },
];

const deepRule: DailyRule = {
  id: "deep",
  areaId: "research",
  minMinutesPerDay: 90,
  label: "Deep focus",
  kind: "required",
  outsideWindow: { start: "09:00", end: "16:30" },
};

function model(dateKey: string, placed: boolean) {
  return buildDayGrid({
    isDemo: false,
    areas: [
      { id: "research", name: "Research", colour: "#0F6B4C", order: 1 },
    ],
    bands,
    routines: [],
    schedules: placed
      ? [
          {
            id: "busy",
            title: "All day",
            start: "06:00",
            end: "22:00",
            weekday: new Date(`${dateKey}T12:00:00Z`).getUTCDay(),
            kind: "class",
          },
        ]
      : [
          {
            id: "am",
            title: "Class",
            start: "09:00",
            end: "12:00",
            weekday: 1,
            kind: "class",
          },
        ],
    dayTypes: [],
    now: new Date(`${dateKey}T12:00:00+05:30`),
    timezone: "Asia/Kolkata",
    daysVisible: 1,
    startHour: 6,
    endHour: 22,
  });
}

describe("suggestFor", () => {
  it("suggests a workday slot outside the work window", () => {
    const dateKey = "2026-11-16"; // Monday
    const suggestions = suggestFor(dateKey, model(dateKey, false), [deepRule]);
    expect(suggestions).toHaveLength(1);
    const s = suggestions[0]!;
    expect(s.minutes).toBe(90);
    expect(minutesOf(s.end) - minutesOf(s.start)).toBe(90);
    // Must not overlap 09:00–16:30
    expect(
      minutesOf(s.start) >= minutesOf("16:30") ||
        minutesOf(s.end) <= minutesOf("09:00"),
    ).toBe(true);
  });

  it("suggests on a weekend when the day is open", () => {
    const dateKey = "2026-11-15"; // Sunday
    const m = buildDayGrid({
      isDemo: false,
      areas: [
        { id: "research", name: "Research", colour: "#0F6B4C", order: 1 },
      ],
      bands,
      routines: [],
      schedules: [],
      dayTypes: [],
      now: new Date(`${dateKey}T12:00:00+05:30`),
      timezone: "Asia/Kolkata",
      daysVisible: 1,
      startHour: 6,
      endHour: 22,
    });
    const suggestions = suggestFor(dateKey, m, [deepRule]);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.start).toBeTruthy();
  });

  it("returns no suggestion when the day has no room", () => {
    const dateKey = "2026-11-16";
    const m = buildDayGrid({
      isDemo: false,
      areas: [
        { id: "research", name: "Research", colour: "#0F6B4C", order: 1 },
      ],
      bands,
      routines: [],
      schedules: [],
      dayTypes: [],
      placedBlocks: [
        {
          id: "full",
          taskId: "t1",
          title: "Packed",
          areaId: "research",
          colour: "#0F6B4C",
          date: dateKey,
          start: "06:00",
          end: "22:00",
        },
      ],
      now: new Date(`${dateKey}T12:00:00+05:30`),
      timezone: "Asia/Kolkata",
      daysVisible: 1,
      startHour: 6,
      endHour: 22,
    });
    expect(suggestFor(dateKey, m, [deepRule])).toEqual([]);
  });

  it("skips soft rules", () => {
    const dateKey = "2026-11-15";
    const soft: DailyRule = {
      ...deepRule,
      id: "soft",
      kind: "soft",
    };
    const m = buildDayGrid({
      isDemo: false,
      areas: [
        { id: "research", name: "Research", colour: "#0F6B4C", order: 1 },
      ],
      bands,
      routines: [],
      schedules: [],
      dayTypes: [],
      now: new Date(`${dateKey}T12:00:00+05:30`),
      timezone: "Asia/Kolkata",
      daysVisible: 1,
      startHour: 6,
      endHour: 22,
    });
    expect(suggestFor(dateKey, m, [soft])).toEqual([]);
  });
});
