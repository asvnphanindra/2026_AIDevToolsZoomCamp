import { describe, expect, it } from "vitest";
import { buildDayGrid } from "@/lib/day-grid";
import { freeSlots } from "@/lib/free-slots";
import {
  expandSchedulesForDate,
  type Schedule,
} from "@/lib/schedules";

const bands = [
  {
    id: "h",
    level: "high" as const,
    start: "07:00",
    end: "12:00",
    weekdays: [1, 2, 3, 4, 5],
  },
  {
    id: "m",
    level: "medium" as const,
    start: "13:00",
    end: "16:00",
    weekdays: [1, 2, 3, 4, 5],
  },
];

const versioned: Schedule = {
  id: "teach",
  name: "Teach",
  areaId: "work",
  versions: [
    {
      id: "v1",
      name: "Before",
      effectiveFrom: "2026-01-01",
      effectiveTo: "2026-03-31",
      slots: [
        {
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "12:00",
          label: "Class A",
        },
      ],
    },
    {
      id: "v2",
      name: "After",
      effectiveFrom: "2026-04-01",
      effectiveTo: "2026-12-31",
      slots: [
        {
          dayOfWeek: 1,
          startTime: "14:00",
          endTime: "17:00",
          label: "Class B",
        },
      ],
    },
  ],
};

function modelFor(
  dateKey: string,
  extras?: {
    holiday?: boolean;
    versionedSchedules?: Schedule[];
    schedules?: Parameters<typeof buildDayGrid>[0]["schedules"];
  },
) {
  return buildDayGrid({
    isDemo: false,
    areas: [{ id: "work", name: "Job", colour: "#0F6B4C", order: 1 }],
    bands,
    routines: [],
    schedules: extras?.schedules ?? [],
    versionedSchedules: extras?.versionedSchedules,
    dayTypes: extras?.holiday
      ? [{ date: dateKey, type: "holiday", label: "Holiday" }]
      : [],
    now: new Date(`${dateKey}T12:00:00+05:30`),
    timezone: "Asia/Kolkata",
    daysVisible: 1,
    startHour: 6,
    endHour: 22,
  });
}

describe("freeSlots", () => {
  it("finds gaps around a workday fixed schedule", () => {
    const dateKey = "2026-11-16"; // Monday
    const model = modelFor(dateKey, {
      schedules: [
        {
          id: "c1",
          title: "Lecture",
          start: "09:00",
          end: "12:00",
          weekday: 1,
          kind: "class",
        },
      ],
    });
    const slots = freeSlots(dateKey, model, { minMinutes: 60 });
    expect(slots.some((s) => s.start === "06:00" && s.end === "09:00")).toBe(
      true,
    );
    expect(slots.some((s) => s.start === "12:00")).toBe(true);
    expect(slots.every((s) => s.allowedDepths.includes("deep"))).toBe(true);
  });

  it("returns wide free windows on a weekend with no schedule", () => {
    const dateKey = "2026-11-15"; // Sunday
    const model = modelFor(dateKey);
    const slots = freeSlots(dateKey, model, { minMinutes: 60 });
    expect(slots.length).toBeGreaterThanOrEqual(1);
    expect(slots[0]?.start).toBe("06:00");
    expect(slots[0]?.end).toBe("22:00");
  });

  it("treats holiday as fully free (no fixed schedule items)", () => {
    const dateKey = "2026-11-16";
    const model = modelFor(dateKey, {
      holiday: true,
      schedules: [
        {
          id: "c1",
          title: "Lecture",
          start: "09:00",
          end: "12:00",
          weekday: 1,
          kind: "class",
        },
      ],
    });
    expect(model.items.some((i) => i.kind === "schedule")).toBe(false);
    const slots = freeSlots(dateKey, model, { minMinutes: 60 });
    expect(slots).toEqual([
      expect.objectContaining({ start: "06:00", end: "22:00" }),
    ]);
  });

  it("reflects timetable version switch in free gaps", () => {
    const beforeKey = "2026-03-30"; // Monday
    const afterKey = "2026-04-06"; // Monday
    expect(expandSchedulesForDate([versioned], beforeKey)[0]?.start).toBe(
      "09:00",
    );
    expect(expandSchedulesForDate([versioned], afterKey)[0]?.start).toBe(
      "14:00",
    );
    const before = freeSlots(beforeKey, modelFor(beforeKey, {
      versionedSchedules: [versioned],
    }), { minMinutes: 60 });
    const after = freeSlots(afterKey, modelFor(afterKey, {
      versionedSchedules: [versioned],
    }), { minMinutes: 60 });
    expect(before.some((s) => s.start === "12:00")).toBe(true);
    expect(before.some((s) => s.start === "06:00" && s.end === "09:00")).toBe(
      true,
    );
    expect(after.some((s) => s.start === "06:00" && s.end === "14:00")).toBe(
      true,
    );
    expect(after.some((s) => s.start === "17:00")).toBe(true);
  });

  it("runs under 5ms for a typical day", () => {
    const dateKey = "2026-11-16";
    const model = modelFor(dateKey, {
      versionedSchedules: [versioned],
      schedules: [
        {
          id: "c1",
          title: "Lecture",
          start: "09:00",
          end: "10:00",
          weekday: 1,
          kind: "class",
        },
      ],
    });
    const t0 = performance.now();
    for (let i = 0; i < 50; i++) freeSlots(dateKey, model, { minMinutes: 30 });
    const avg = (performance.now() - t0) / 50;
    expect(avg).toBeLessThan(5);
  });
});
