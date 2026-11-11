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
