import { describe, expect, it } from "vitest";
import {
  layerStateForMode,
  modeFromLegacyLayers,
  showsTasksToFocus,
} from "@/lib/scheduler-layers";

describe("scheduler layers", () => {
  it("combined shows availability/recurring/scheduled, not focus paint", () => {
    expect(layerStateForMode("combined")).toEqual({
      availability: true,
      recurring: true,
      scheduled: true,
      focus: false,
    });
    expect(showsTasksToFocus("combined")).toBe(false);
  });

  it("focus mode keeps scheduled blocks and Tasks to Focus panel", () => {
    expect(layerStateForMode("focus")).toEqual({
      availability: false,
      recurring: false,
      scheduled: true,
      focus: false,
    });
    expect(showsTasksToFocus("focus")).toBe(true);
  });

  it("single exclusive layers toggle only that layer", () => {
    expect(layerStateForMode("availability").availability).toBe(true);
    expect(layerStateForMode("recurring").recurring).toBe(true);
    expect(layerStateForMode("scheduled").scheduled).toBe(true);
    expect(showsTasksToFocus("scheduled")).toBe(false);
  });

  it("maps legacy multi-select layers to Combined or one mode", () => {
    expect(
      modeFromLegacyLayers({
        availability: true,
        recurring: true,
        scheduled: true,
        focus: true,
      }),
    ).toBe("combined");
    expect(
      modeFromLegacyLayers({
        availability: false,
        recurring: true,
        scheduled: false,
        focus: false,
      }),
    ).toBe("recurring");
  });
});
