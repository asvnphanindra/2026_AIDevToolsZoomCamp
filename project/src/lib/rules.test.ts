import { describe, expect, it } from "vitest";
import {
  evaluateDayRules,
  evaluateWeekMinimums,
  minutesForAreaOnDate,
} from "@/lib/rules";
import type { DailyRule } from "@/lib/rules";

describe("daily minimum rules", () => {
  const rules: DailyRule[] = [
    {
      id: "r-work",
      areaId: "work",
      label: "Work",
      minMinutesPerDay: 60,
    },
  ];

  const items = [
    {
      date: "2026-11-11",
      start: "09:00",
      end: "09:30",
      areaId: "work",
      kind: "block",
    },
    {
      date: "2026-11-11",
      start: "10:00",
      end: "11:00",
      areaId: "work",
      kind: "block",
    },
  ];

  it("sums block minutes for an area on a date", () => {
    expect(minutesForAreaOnDate("2026-11-11", "work", items)).toBe(90);
  });

  it("reports shortfalls when under daily min", () => {
    const short = evaluateDayRules("2026-11-11", rules, [
      {
        date: "2026-11-11",
        start: "09:00",
        end: "09:30",
        areaId: "work",
        kind: "block",
      },
    ]);
    expect(short).toEqual([
      expect.objectContaining({
        areaId: "work",
        required: 60,
        actual: 30,
        missing: 30,
      }),
    ]);
    expect(evaluateDayRules("2026-11-11", rules, items)).toEqual([]);
  });

  it("builds soft weekly allocated vs planned rows", () => {
    // 2026-W46 is Mon 2026-11-09 … Sun 2026-11-15
    const rows = evaluateWeekMinimums(
      "2026-W46",
      rules,
      items,
      "Asia/Kolkata",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      areaId: "work",
      allocated: 90,
      minMinutesPerDay: 60,
      plannedMin: 60 * 7,
    });
  });
});
