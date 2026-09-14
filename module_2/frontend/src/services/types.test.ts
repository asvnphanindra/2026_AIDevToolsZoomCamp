import { describe, expect, it } from "vitest";

import { DAY_NAMES, FIRST_HOUR, HOURS, LAST_HOUR, slotKey } from "@/services/types";

describe("timetable constants", () => {
  it("covers Monday through Sunday", () => {
    expect(DAY_NAMES).toHaveLength(7);
    expect(DAY_NAMES[0]).toBe("Monday");
    expect(DAY_NAMES[6]).toBe("Sunday");
  });

  it("covers hourly slots from 06:00 through 23:00", () => {
    expect(FIRST_HOUR).toBe(6);
    expect(LAST_HOUR).toBe(23);
    expect(HOURS[0]).toBe(6);
    expect(HOURS.at(-1)).toBe(23);
    expect(HOURS).toHaveLength(LAST_HOUR - FIRST_HOUR + 1);
  });

  it("builds stable slot keys", () => {
    expect(slotKey({ day: 0, hour: 9 })).toBe("0-9");
    expect(slotKey({ day: 6, hour: 23 })).toBe("6-23");
  });
});
