import { describe, expect, it } from "vitest";
import { buildDayGrid, findDeepWorkInLowBand } from "@/lib/day-grid";
import { fictionalSeed } from "@/data/fictional-seed";

describe("day grid planner model", () => {
  it("builds a five-day centered grid with seed schedule in demo", () => {
    const model = buildDayGrid({
      isDemo: true,
      areas: fictionalSeed.areas,
      now: new Date("2026-11-11T12:00:00+05:30"),
      timezone: "Asia/Kolkata",
    });
    expect(model.dayKeys).toHaveLength(5);
    expect(model.todayIndex).toBe(2);
    expect(model.scheduleFromSeed).toBeGreaterThan(0);
    expect(model.items.some((i) => i.kind === "schedule")).toBe(true);
    expect(model.items.some((i) => i.kind === "block")).toBe(true);
  });

  it("builds a single-day grid when daysVisible is 1", () => {
    const model = buildDayGrid({
      isDemo: true,
      areas: fictionalSeed.areas,
      now: new Date("2026-11-11T12:00:00+05:30"),
      timezone: "Asia/Kolkata",
      daysVisible: 1,
    });
    expect(model.dayKeys).toHaveLength(1);
    expect(model.todayIndex).toBe(0);
    expect(model.dayKeys[0]).toBe("2026-11-11");
  });

  it("personal empty config renders no demo schedule or routines", () => {
    const model = buildDayGrid({
      isDemo: false,
      areas: [],
      bands: [],
      routines: [],
      schedules: [],
      dayTypes: [],
      now: new Date("2026-11-11T12:00:00+05:30"),
      timezone: "Asia/Kolkata",
    });
    expect(model.items.some((i) => i.kind === "schedule")).toBe(false);
    expect(model.items.some((i) => i.kind === "routine")).toBe(false);
    expect(model.bands).toEqual([]);
    expect(model.scheduleFromSeed).toBe(0);
  });

  it("paints versioned teaching-plan slots for a personal account", () => {
    const model = buildDayGrid({
      isDemo: false,
      areas: [{ id: "work", name: "Job", colour: "#0F6B4C", order: 1 }],
      bands: [],
      routines: [],
      schedules: [],
      versionedSchedules: [
        {
          id: "sched-job",
          name: "Teaching",
          areaId: "work",
          versions: [
            {
              id: "v1",
              name: "Term",
              effectiveFrom: "2026-01-01",
              effectiveTo: "2026-12-31",
              slots: [
                {
                  dayOfWeek: 3,
                  startTime: "09:00",
                  endTime: "10:30",
                  label: "Section A",
                },
              ],
            },
          ],
        },
      ],
      dayTypes: [],
      now: new Date("2026-11-11T12:00:00+05:30"), // Wednesday
      timezone: "Asia/Kolkata",
      daysVisible: 1,
    });
    const schedule = model.items.filter((i) => i.kind === "schedule");
    expect(schedule).toHaveLength(1);
    expect(schedule[0]?.title).toBe("Section A");
    expect(schedule[0]?.areaId).toBe("work");
  });

  it("flags deep-work blocks overlapping a low energy band", () => {
    const warnings = findDeepWorkInLowBand(
      [
        {
          id: "b1",
          date: "2026-11-11",
          title: "Deep focus write-up",
          start: "20:00",
          end: "21:00",
          kind: "block",
          colour: "#0F6B4C",
          deepWork: true,
        },
      ],
      fictionalSeed.bands,
      "Asia/Kolkata",
    );
    expect(warnings.map((w) => w.blockId)).toContain("b1");
  });
});
