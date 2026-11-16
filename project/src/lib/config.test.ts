import { describe, expect, it } from "vitest";
import {
  datedDayTypesFromOffsets,
  dayTypeForDate,
  parseUserSettings,
  DEFAULT_USER_SETTINGS,
} from "@/lib/config";
import type { SeedDayType } from "@/data/fictional-seed";

describe("config model", () => {
  it("parses settings with defaults", () => {
    expect(parseUserSettings(undefined)).toEqual(DEFAULT_USER_SETTINGS);
    expect(
      parseUserSettings({
        timezone: "UTC",
        settings: { gridStartHour: 7, reminderMinutes: 30 },
      }),
    ).toMatchObject({
      timezone: "UTC",
      gridStartHour: 7,
      reminderDefaultMin: 30,
    });
  });

  it("converts dayOffset seed types to YYYY-MM-DD keys", () => {
    const offsets: SeedDayType[] = [
      { dayOffset: 0, type: "holiday", label: "Today off" },
      { dayOffset: 1, type: "exam", label: "Exam" },
    ];
    const dated = datedDayTypesFromOffsets(offsets, "2026-11-16");
    expect(dated.map((d) => d.date)).toEqual(["2026-11-16", "2026-11-17"]);
    expect(dated.every((d) => d.id === d.date)).toBe(true);
  });

  it("looks up day types by date key first", () => {
    const dated = [
      {
        id: "2026-11-16",
        date: "2026-11-16",
        type: "holiday" as const,
        label: "Holiday",
      },
    ];
    expect(dayTypeForDate("2026-11-16", "2026-11-16", dated)?.type).toBe(
      "holiday",
    );
    expect(dayTypeForDate("2026-11-17", "2026-11-16", dated)).toBeUndefined();
  });
});
