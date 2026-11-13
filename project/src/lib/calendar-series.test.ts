import { describe, expect, it } from "vitest";
import {
  describeSeriesRule,
  expandSeriesOccurrences,
  seriesExpandRange,
  type CalendarSeries,
} from "@/lib/calendar-series";

describe("calendar series expand-on-read", () => {
  it("describes weekly and monthly rules", () => {
    expect(describeSeriesRule({ freq: "weeks", interval: 1 })).toBe(
      "Every week",
    );
    expect(
      describeSeriesRule({ freq: "months", interval: 2, dayOfMonth: 15 }),
    ).toBe("Every 2 months on the 15");
  });

  it("expands weekly series inside a range and skips paused", () => {
    const series: CalendarSeries = {
      id: "s1",
      label: "Weekly review",
      kind: "appointment",
      rule: { freq: "weeks", interval: 1 },
      startDate: "2026-11-03",
      paused: false,
    };
    const occ = expandSeriesOccurrences(series, "2026-11-01", "2026-11-30");
    expect(occ.map((o) => o.date)).toEqual([
      "2026-11-03",
      "2026-11-10",
      "2026-11-17",
      "2026-11-24",
    ]);
    expect(
      expandSeriesOccurrences({ ...series, paused: true }, "2026-11-01", "2026-11-30"),
    ).toEqual([]);
  });

  it("builds a three-month expand window from today", () => {
    const { start, end } = seriesExpandRange(
      new Date("2026-11-11T12:00:00+05:30"),
      "Asia/Kolkata",
    );
    expect(start).toBe("2026-11-01");
    expect(end).toBe("2027-01-31");
  });

  it("skips expand when startDate is missing (Firestore offset-only docs)", () => {
    const broken = {
      id: "s-broken",
      label: "Broken",
      kind: "series",
      rule: { freq: "months", interval: 1, dayOfMonth: 1 },
      paused: false,
    } as unknown as CalendarSeries;
    expect(
      expandSeriesOccurrences(broken, "2026-11-01", "2026-11-30"),
    ).toEqual([]);
  });
});
