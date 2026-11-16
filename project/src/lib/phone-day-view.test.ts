import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_PHONE_DAY_VIEW,
  loadPhoneDayView,
  readPhoneDayView,
  writePhoneDayView,
} from "@/lib/phone-day-view";

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      clear: () => store.clear(),
      removeItem: (key: string) => {
        store.delete(key);
      },
    },
  });
});

describe("phone day view preference", () => {
  it("defaults to grid when unset", () => {
    expect(loadPhoneDayView()).toBe(DEFAULT_PHONE_DAY_VIEW);
    expect(DEFAULT_PHONE_DAY_VIEW).toBe("grid");
  });

  it("persists agenda and grid", () => {
    writePhoneDayView("agenda");
    expect(readPhoneDayView()).toBe("agenda");
    expect(loadPhoneDayView()).toBe("agenda");
    writePhoneDayView("grid");
    expect(loadPhoneDayView()).toBe("grid");
  });

  it("ignores corrupt storage", () => {
    localStorage.setItem("work-planner.phone-day-view", "{bad");
    expect(readPhoneDayView()).toBeNull();
    expect(loadPhoneDayView()).toBe("grid");
  });
});
