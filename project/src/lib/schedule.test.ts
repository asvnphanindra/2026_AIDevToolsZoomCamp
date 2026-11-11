import { describe, expect, it } from "vitest";
import {
  applyScheduleChanges,
  expandFixedSchedule,
  hidesCommute,
  hidesFixedSchedule,
  rangesOverlap,
} from "@/lib/schedule";
import type { SeedDayType, SeedSchedule, SeedScheduleChange } from "@/data/fictional-seed";

describe("schedule expansion", () => {
  const schedule: SeedSchedule[] = [
    {
      id: "standup",
      title: "Standup",
      weekday: 1,
      start: "09:00",
      end: "09:30",
      kind: "fixed",
    },
  ];

  it("hides fixed schedule / commute for holiday and online days", () => {
    expect(hidesFixedSchedule("holiday")).toBe(true);
    expect(hidesFixedSchedule("online")).toBe(false);
    expect(hidesCommute("online")).toBe(true);
  });

  it("detects time-range overlaps", () => {
    expect(rangesOverlap("09:00", "10:00", "09:30", "10:30")).toBe(true);
    expect(rangesOverlap("09:00", "10:00", "10:00", "11:00")).toBe(false);
  });

  it("expands weekday fixed items and skips holiday offsets", () => {
    // 2026-11-09 is Monday; center todayIndex=2 → dayKeys[2] = Wed 2026-11-11
    const dayKeys = [
      "2026-11-09",
      "2026-11-10",
      "2026-11-11",
      "2026-11-12",
      "2026-11-13",
    ];
    const dayTypes: SeedDayType[] = [
      { dayOffset: -2, type: "holiday", label: "Holiday" },
    ];
    const items = expandFixedSchedule(
      dayKeys,
      "Asia/Kolkata",
      2,
      schedule,
      dayTypes,
    );
    expect(items.some((i) => i.date === "2026-11-09")).toBe(false);
    expect(items.some((i) => i.date === "2026-11-10" && i.title === "Standup")).toBe(
      false,
    );
    // Tuesday 2026-11-10 weekday=2 — no Monday standup
    // Monday is holiday (offset -2 from Wed today)
    const mondayItems = expandFixedSchedule(
      ["2026-11-09"],
      "Asia/Kolkata",
      0,
      schedule,
      [{ dayOffset: 0, type: "normal", label: "Normal" }],
    );
    expect(mondayItems).toEqual([
      expect.objectContaining({
        date: "2026-11-09",
        title: "Standup",
        start: "09:00",
      }),
    ]);
  });

  it("applies cancel and substitute one-offs (US-B5)", () => {
    const dayKeys = ["2026-11-09", "2026-11-10", "2026-11-11"];
    const base = expandFixedSchedule(
      dayKeys,
      "Asia/Kolkata",
      0,
      schedule,
      [],
    );
    const changes: SeedScheduleChange[] = [
      {
        id: "c1",
        dayOffset: 0,
        kind: "cancel",
        title: "Standup",
        start: "09:00",
        end: "09:30",
      },
      {
        id: "c2",
        dayOffset: 0,
        kind: "substitute",
        title: "Sync",
        start: "10:00",
        end: "10:30",
      },
    ];
    const next = applyScheduleChanges(base, dayKeys, 0, changes);
    expect(next.some((i) => i.title === "Standup")).toBe(false);
    expect(next.some((i) => i.title === "Sync (sub)")).toBe(true);
  });
});
