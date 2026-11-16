import { describe, expect, it } from "vitest";
import {
  expandSchedulesForDate,
  mergeAdjacentSlots,
  scheduleFromTeachingPlan,
  type Schedule,
} from "@/lib/schedules";
import { seedTeachingPlan } from "@/lib/teaching-plan";

const twoVersions: Schedule = {
  id: "office",
  name: "Office hours",
  areaId: "learning",
  versions: [
    {
      id: "v1",
      name: "Term 1",
      effectiveFrom: "2026-01-01",
      effectiveTo: "2026-03-31",
      slots: [
        {
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "10:00",
          label: "Office A",
        },
      ],
    },
    {
      id: "v2",
      name: "Term 2",
      effectiveFrom: "2026-04-01",
      effectiveTo: "2026-06-30",
      slots: [
        {
          dayOfWeek: 1,
          startTime: "14:00",
          endTime: "15:00",
          label: "Office B",
        },
      ],
    },
  ],
};

describe("mergeAdjacentSlots", () => {
  it("merges a 3-period lab into one block", () => {
    const merged = mergeAdjacentSlots([
      { start: "13:00", end: "13:50", label: "Lab" },
      { start: "13:50", end: "14:40", label: "Lab" },
      { start: "14:40", end: "15:30", label: "Lab" },
    ]);
    expect(merged).toEqual([{ start: "13:00", end: "15:30", label: "Lab" }]);
  });

  it("does not merge different labels", () => {
    const merged = mergeAdjacentSlots([
      { start: "09:00", end: "09:50", label: "A" },
      { start: "09:50", end: "10:40", label: "B" },
    ]);
    expect(merged).toHaveLength(2);
  });
});

describe("expandSchedulesForDate", () => {
  it("switches slots on the version effectiveFrom date", () => {
    const before = expandSchedulesForDate([twoVersions], "2026-03-30");
    const after = expandSchedulesForDate([twoVersions], "2026-04-06");
    // 2026-03-30 is Monday; 2026-04-06 is Monday
    expect(before.map((i) => i.title)).toEqual(["Office A"]);
    expect(before[0]?.start).toBe("09:00");
    expect(after.map((i) => i.title)).toEqual(["Office B"]);
    expect(after[0]?.start).toBe("14:00");
  });

  it("hides schedule on holiday", () => {
    const items = expandSchedulesForDate([twoVersions], "2026-04-06", {
      dayType: "holiday",
    });
    expect(items).toEqual([]);
  });

  it("works for a non-teaching area", () => {
    const items = expandSchedulesForDate([twoVersions], "2026-04-06");
    expect(items[0]?.areaId).toBe("learning");
  });

  it("merges lab periods from teaching plan conversion", () => {
    const plan = seedTeachingPlan("research");
    plan.timetables = [
      {
        id: "tt-lab",
        name: "Lab week",
        effectiveFrom: plan.semesterStart,
        effectiveTo: plan.semesterEnd,
        slots: [
          {
            dayOfWeek: 5,
            startTime: "13:00",
            endTime: "13:50",
            sectionId: "sec-a",
          },
          {
            dayOfWeek: 5,
            startTime: "13:50",
            endTime: "14:40",
            sectionId: "sec-a",
          },
          {
            dayOfWeek: 5,
            startTime: "14:40",
            endTime: "15:30",
            sectionId: "sec-a",
          },
        ],
      },
    ];
    const schedule = scheduleFromTeachingPlan(plan);
    expect(schedule.areaId).toBe("research");
    // Find a Friday inside the semester
    const fri = "2026-11-20"; // adjust if seed start moves — use known dow
    // Build a Friday from semesterStart
    const start = plan.semesterStart;
    let cursor = start;
    for (let i = 0; i < 14; i++) {
      const [y, m, d] = cursor.split("-").map(Number);
      const dt = new Date(Date.UTC(y!, m! - 1, d!, 12, 0, 0));
      if (dt.getUTCDay() === 5) {
        const items = expandSchedulesForDate([schedule], cursor);
        expect(items).toHaveLength(1);
        expect(items[0]?.start).toBe("13:00");
        expect(items[0]?.end).toBe("15:30");
        expect(items[0]?.title).toBe("Section A");
        return;
      }
      dt.setUTCDate(dt.getUTCDate() + 1);
      cursor = dt.toISOString().slice(0, 10);
    }
    expect(fri).toBeTruthy(); // unreachable if semester has a Friday
  });
});
