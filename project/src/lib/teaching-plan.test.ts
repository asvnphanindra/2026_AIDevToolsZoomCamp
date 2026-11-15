import { describe, expect, it } from "vitest";
import {
  activeTimetable,
  coverageFor,
  findJobArea,
  isJobArea,
  seedTeachingPlan,
  setCoverageAndCascade,
  type TimetableVersion,
} from "@/lib/teaching-plan";

describe("isJobArea", () => {
  it("matches seed id work, name Job, and legacy Work", () => {
    expect(isJobArea({ id: "work", name: "Job" })).toBe(true);
    expect(isJobArea({ id: "work", name: "Work" })).toBe(true);
    expect(isJobArea({ id: "job", name: "Teaching" })).toBe(true);
    expect(isJobArea({ id: "study", name: "Study" })).toBe(false);
  });

  it("findJobArea prefers Job-named match", () => {
    const hit = findJobArea([
      { id: "work", name: "Work", order: 1 },
      { id: "study", name: "Study", order: 2 },
    ]);
    expect(hit?.id).toBe("work");
  });
});

describe("activeTimetable", () => {
  const versions: TimetableVersion[] = [
    {
      id: "v1",
      name: "Early",
      effectiveFrom: "2026-01-01",
      effectiveTo: "2026-03-31",
      slots: [
        {
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "10:00",
          sectionId: "sec-a",
        },
      ],
    },
    {
      id: "v2",
      name: "Late",
      effectiveFrom: "2026-04-01",
      effectiveTo: "2026-06-30",
      slots: [
        {
          dayOfWeek: 2,
          startTime: "11:00",
          endTime: "12:00",
          sectionId: "sec-a",
        },
      ],
    },
  ];

  it("picks the version covering the date within semester", () => {
    const active = activeTimetable(
      versions,
      "2026-04-15",
      "2026-01-01",
      "2026-06-30",
    );
    expect(active?.id).toBe("v2");
  });

  it("returns null outside semester", () => {
    expect(
      activeTimetable(versions, "2025-12-01", "2026-01-01", "2026-06-30"),
    ).toBeNull();
  });

  it("prefers the latest effectiveFrom when overlapping", () => {
    const overlap: TimetableVersion[] = [
      ...versions,
      {
        id: "v2b",
        name: "Override",
        effectiveFrom: "2026-04-10",
        effectiveTo: "2026-04-20",
        slots: [],
      },
    ];
    expect(
      activeTimetable(overlap, "2026-04-15", "2026-01-01", "2026-06-30")?.id,
    ).toBe("v2b");
  });
});

describe("setCoverageAndCascade", () => {
  it("sets coverage and advances next topic planned dates at 100%", () => {
    const base = seedTeachingPlan("work", new Date("2026-01-05T12:00:00Z"));
    // Force semester + timetable to known Monday start (2026-01-05 is Monday).
    const plan = {
      ...base,
      semesterStart: "2026-01-05",
      semesterEnd: "2026-04-30",
      timetables: [
        {
          id: "tt",
          name: "Fixed",
          effectiveFrom: "2026-01-05",
          effectiveTo: "2026-04-30",
          slots: [
            {
              dayOfWeek: 1,
              startTime: "09:00",
              endTime: "10:30",
              sectionId: "sec-a",
            },
            {
              dayOfWeek: 3,
              startTime: "09:00",
              endTime: "10:30",
              sectionId: "sec-a",
            },
          ],
        },
      ],
    };

    const next = setCoverageAndCascade(
      plan,
      "topic-intro",
      "sec-a",
      100,
      "2026-01-05",
    );

    expect(coverageFor(next.mappings, "topic-intro", "sec-a")).toBe(100);
    const basics = next.mappings.find(
      (m) => m.topicId === "topic-basics" && m.sectionId === "sec-a",
    );
    // Next sec-a slot after Mon 2026-01-05 is Wed 2026-01-07.
    expect(basics?.plannedDate).toBe("2026-01-07");
    expect(basics?.plannedDayOfWeek).toBe(3);

    const practice = next.mappings.find(
      (m) => m.topicId === "topic-practice" && m.sectionId === "sec-a",
    );
    expect(practice?.plannedDate).toBe("2026-01-12");
    expect(practice?.plannedDayOfWeek).toBe(1);

    // Mappings are never deleted.
    expect(next.mappings.length).toBe(plan.mappings.length);
  });

  it("does not delete mappings when coverage is partial", () => {
    const plan = seedTeachingPlan("work", new Date("2026-01-05T12:00:00Z"));
    const before = plan.mappings.length;
    const next = setCoverageAndCascade(
      plan,
      "topic-intro",
      "sec-a",
      40,
      "2026-01-05",
    );
    expect(next.mappings.length).toBe(before);
    expect(coverageFor(next.mappings, "topic-intro", "sec-a")).toBe(40);
  });
});
