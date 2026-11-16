import { describe, expect, it } from "vitest";
import {
  SETUP_TEMPLATES,
  getTemplate,
  materializeTemplateSeries,
  settingsFromTemplate,
  templateContainsPrivacyMarker,
} from "@/data/templates/index";
import type { SetupTemplateId } from "@/data/templates/types";

describe("setup templates", () => {
  it("exports four templates with stable ids", () => {
    expect(SETUP_TEMPLATES.map((t) => t.id)).toEqual([
      "teacher-phd",
      "student",
      "office",
      "blank",
    ]);
    for (const id of SETUP_TEMPLATES.map((t) => t.id) as SetupTemplateId[]) {
      expect(getTemplate(id).id).toBe(id);
    }
  });

  it("blank has no areas, bands, schedule, or rules", () => {
    const blank = getTemplate("blank");
    expect(blank.areas).toEqual([]);
    expect(blank.bands).toEqual([]);
    expect(blank.schedule).toEqual([]);
    expect(blank.rules).toEqual([]);
    expect(blank.routines).toEqual([]);
    expect(blank.series).toEqual([]);
  });

  it("non-blank templates include areas and bands", () => {
    for (const id of ["teacher-phd", "student", "office"] as SetupTemplateId[]) {
      const t = getTemplate(id);
      expect(t.areas.length).toBeGreaterThanOrEqual(3);
      expect(t.bands.length).toBeGreaterThan(0);
      expect(t.areas.every((a) => a.id && a.name && a.colour)).toBe(true);
    }
  });

  it("materializes series startDate from day offsets", () => {
    const teacher = getTemplate("teacher-phd");
    const rows = materializeTemplateSeries(teacher.series, "2026-11-16");
    expect(rows.every((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.startDate))).toBe(
      true,
    );
    const groceries = rows.find((r) => r.id === "ser-groceries");
    expect(groceries?.startDate).toBe("2026-11-21");
  });

  it("settingsFromTemplate merges defaults and templateId", () => {
    const settings = settingsFromTemplate(getTemplate("student"), {
      setupDone: true,
    });
    expect(settings.setupDone).toBe(true);
    expect(settings.checkInCadence).toBe("after-block");
    expect(settings.timezone).toBeTruthy();
  });

  it("contains no personal privacy markers", () => {
    for (const template of SETUP_TEMPLATES) {
      expect(templateContainsPrivacyMarker(template)).toBeNull();
    }
  });
});
