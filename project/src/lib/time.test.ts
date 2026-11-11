import { describe, expect, it } from "vitest";
import {
  buildHalfHourSlots,
  dateKeyInTz,
  formatHhmm,
  minutesOf,
  weekCenteredDayKeys,
  weekdaySun0,
} from "@/lib/time";

describe("time helpers", () => {
  it("parses and formats HH:mm", () => {
    expect(minutesOf("09:30")).toBe(570);
    expect(formatHhmm(570)).toBe("09:30");
  });

  it("builds half-hour slots", () => {
    expect(buildHalfHourSlots(9, 11)).toEqual([
      "09:00",
      "09:30",
      "10:00",
      "10:30",
    ]);
  });

  it("centers five day keys on today in IST", () => {
    const from = new Date("2026-11-11T12:00:00+05:30");
    const { keys, todayIndex } = weekCenteredDayKeys("Asia/Kolkata", from);
    expect(todayIndex).toBe(2);
    expect(keys).toHaveLength(5);
    expect(keys[todayIndex]).toBe(dateKeyInTz(from, "Asia/Kolkata"));
    expect(weekdaySun0("2026-11-11", "Asia/Kolkata")).toBe(3); // Wed
  });
});
