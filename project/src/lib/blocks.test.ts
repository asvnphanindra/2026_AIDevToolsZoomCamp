import { describe, expect, it } from "vitest";
import {
  addMinutes,
  durationMinutes,
  findConflicts,
  snapMinutes,
} from "@/lib/blocks";

describe("blocks helpers", () => {
  it("computes duration and adds minutes on HH:mm", () => {
    expect(durationMinutes("09:00", "10:30")).toBe(90);
    expect(addMinutes("09:15", 45)).toBe("10:00");
  });

  it("snaps to 15-minute grid inside window", () => {
    expect(snapMinutes(9 * 60 + 7, 5, 22)).toBe(9 * 60);
    expect(snapMinutes(9 * 60 + 8, 5, 22)).toBe(9 * 60 + 15);
    expect(snapMinutes(4 * 60, 5, 22)).toBe(5 * 60);
  });

  it("finds overlapping items on the same date", () => {
    const items = [
      {
        id: "a",
        date: "2026-11-11",
        start: "09:00",
        end: "10:00",
        title: "A",
        kind: "block",
      },
      {
        id: "b",
        date: "2026-11-11",
        start: "10:00",
        end: "11:00",
        title: "B",
        kind: "block",
      },
    ];
    expect(
      findConflicts({ date: "2026-11-11", start: "09:30", end: "10:30" }, items),
    ).toHaveLength(2);
    expect(
      findConflicts(
        { id: "a", date: "2026-11-11", start: "09:00", end: "10:00" },
        items,
      ),
    ).toHaveLength(0);
  });
});
