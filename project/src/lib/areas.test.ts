import { describe, expect, it } from "vitest";
import { migrateJobAreaName } from "@/lib/areas";

describe("migrateJobAreaName", () => {
  it("renames legacy Work display name for id work", () => {
    const next = migrateJobAreaName([
      { id: "work", name: "Work", colour: "#0F6B4C", order: 1 },
      { id: "study", name: "Study", colour: "#1D4E89", order: 2 },
    ]);
    expect(next[0]?.name).toBe("Job");
    expect(next[1]?.name).toBe("Study");
  });

  it("leaves Job unchanged", () => {
    const areas = [
      { id: "work", name: "Job", colour: "#0F6B4C", order: 1 },
    ];
    expect(migrateJobAreaName(areas)).toBe(areas);
  });
});
