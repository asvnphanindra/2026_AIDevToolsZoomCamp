import { describe, expect, it } from "vitest";
import {
  clampCoverage,
  clampToSemester,
  expandSlotOccurrences,
  parseTopicsPaste,
  seedTlpPlan,
  type TlpPlan,
  type TlpTimetable,
} from "@/lib/tlp";

describe("clampCoverage", () => {
  it("clamps to 0–100 and rounds", () => {
    expect(clampCoverage(-5)).toBe(0);
    expect(clampCoverage(150)).toBe(100);
    expect(clampCoverage(33.4)).toBe(33);
    expect(clampCoverage(33.6)).toBe(34);
    expect(clampCoverage(Number.NaN)).toBe(0);
  });
});

describe("parseTopicsPaste", () => {
  it("parses one topic per non-empty line", () => {
    expect(parseTopicsPaste("  Intro  \n\nCore\n  Lab day\n")).toEqual([
      "Intro",
      "Core",
      "Lab day",
    ]);
  });
});

describe("expandSlotOccurrences + version boundaries", () => {
  function planWithVersions(versions: TlpTimetable[]): TlpPlan {
    const base = seedTlpPlan(new Date("2026-01-05T12:00:00Z"));
    return {
      ...base,
      semesterStart: "2026-01-05",
      semesterEnd: "2026-01-18",
      timetables: versions,
    };
  }

  it("expands slots across semester for matching weekdays", () => {
    const plan = planWithVersions([
      {
        id: "v1",
        name: "All",
        effectiveFrom: "2026-01-05",
        effectiveTo: "2026-01-18",
        slots: [
          {
            id: "s1",
            dayOfWeek: 1,
            startTime: "09:00",
            endTime: "10:00",
            sectionId: "sec-a",
            subjectId: "sub-math",
            kind: "class",
          },
        ],
      },
    ]);
    const occ = expandSlotOccurrences(plan);
    // Mondays in range: 2026-01-05, 2026-01-12
    expect(occ.map((o) => o.date)).toEqual(["2026-01-05", "2026-01-12"]);
    expect(occ.every((o) => o.sectionId === "sec-a")).toBe(true);
  });

  it("respects timetable version effectiveFrom/To boundaries", () => {
    const plan = planWithVersions([
      {
        id: "early",
        name: "Early",
        effectiveFrom: "2026-01-05",
        effectiveTo: "2026-01-11",
        slots: [
          {
            id: "early-mon",
            dayOfWeek: 1,
            startTime: "09:00",
            endTime: "10:00",
            sectionId: "sec-a",
            subjectId: "sub-math",
            kind: "class",
          },
        ],
      },
      {
        id: "late",
        name: "Late",
        effectiveFrom: "2026-01-12",
        effectiveTo: "2026-01-18",
        slots: [
          {
            id: "late-mon",
            dayOfWeek: 1,
            startTime: "11:00",
            endTime: "12:00",
            sectionId: "sec-b",
            subjectId: "sub-physics",
            kind: "lab",
          },
        ],
      },
    ]);
    const occ = expandSlotOccurrences(plan);
    expect(occ).toHaveLength(2);
    expect(occ[0]).toMatchObject({
      date: "2026-01-05",
      timetableId: "early",
      sectionId: "sec-a",
      startTime: "09:00",
    });
    expect(occ[1]).toMatchObject({
      date: "2026-01-12",
      timetableId: "late",
      sectionId: "sec-b",
      startTime: "11:00",
      kind: "lab",
    });
  });

  it("returns empty outside / empty semester", () => {
    const plan = planWithVersions([]);
    expect(expandSlotOccurrences(plan)).toEqual([]);
  });
});

describe("clampToSemester", () => {
  it("clamps jump-today into semester", () => {
    expect(clampToSemester("2025-12-01", "2026-01-05", "2026-04-30")).toBe(
      "2026-01-05",
    );
    expect(clampToSemester("2026-06-01", "2026-01-05", "2026-04-30")).toBe(
      "2026-04-30",
    );
    expect(clampToSemester("2026-02-15", "2026-01-05", "2026-04-30")).toBe(
      "2026-02-15",
    );
  });
});
