import { blankTemplate } from "@/data/templates/blank";
import { officeTemplate } from "@/data/templates/office";
import { studentTemplate } from "@/data/templates/student";
import { teacherPhdTemplate } from "@/data/templates/teacher-phd";
import type {
  SetupTemplate,
  SetupTemplateId,
  TemplateSeries,
} from "@/data/templates/types";
import { addDaysToDateKey } from "@/lib/area-goals";
import type { CalendarSeries } from "@/lib/calendar-series";
import {
  DEFAULT_USER_SETTINGS,
  saveBands,
  saveRoutines,
  saveSchedules,
  saveUserSettings,
  type UserSettings,
} from "@/lib/config";
import {
  replaceCollection,
  type PlannerRoot,
  usersRoot,
} from "@/lib/planner-store";
import { dateKeyInTz, DEFAULT_TZ } from "@/lib/time";

export type { SetupTemplate, SetupTemplateId, TemplateSeries };
export {
  blankTemplate,
  officeTemplate,
  studentTemplate,
  teacherPhdTemplate,
};

export const SETUP_TEMPLATES: SetupTemplate[] = [
  teacherPhdTemplate,
  studentTemplate,
  officeTemplate,
  blankTemplate,
];

export function getTemplate(id: SetupTemplateId): SetupTemplate {
  const hit = SETUP_TEMPLATES.find((t) => t.id === id);
  if (!hit) throw new Error(`Unknown template: ${id}`);
  return hit;
}

export function materializeTemplateSeries(
  series: TemplateSeries[],
  todayKey: string,
): CalendarSeries[] {
  return series.map((s) => ({
    id: s.id,
    label: s.label,
    kind: s.kind,
    rule: s.rule,
    startDate: addDaysToDateKey(todayKey, s.startDayOffset),
    paused: Boolean(s.paused),
    time: s.time,
  }));
}

export function settingsFromTemplate(
  template: SetupTemplate,
  opts?: { setupDone?: boolean; templateId?: SetupTemplateId },
): UserSettings {
  return {
    ...DEFAULT_USER_SETTINGS,
    ...template.settings,
    setupDone: opts?.setupDone,
    templateId: opts?.templateId ?? template.id,
  };
}

/** Apply a fictional template into a planner root (users or demo). */
export async function applyTemplate(
  root: PlannerRoot,
  templateId: SetupTemplateId,
  opts?: { setupDone?: boolean; todayKey?: string },
): Promise<SetupTemplate> {
  const template = getTemplate(templateId);
  const todayKey =
    opts?.todayKey ??
    dateKeyInTz(new Date(), template.settings.timezone || DEFAULT_TZ);
  const settings = settingsFromTemplate(template, {
    setupDone: opts?.setupDone,
    templateId,
  });

  await Promise.all([
    replaceCollection(root, "areas", template.areas.map((a) => ({ ...a }))),
    saveBands(root, template.bands.map((b) => ({ ...b }))),
    saveRoutines(root, template.routines.map((r) => ({ ...r }))),
    saveSchedules(root, template.schedule.map((s) => ({ ...s }))),
    replaceCollection(root, "rules", template.rules.map((r) => ({ ...r }))),
    replaceCollection(
      root,
      "series",
      materializeTemplateSeries(template.series, todayKey),
    ),
  ]);

  if (root[0] === "users") {
    await saveUserSettings(root[1], settings);
  } else {
    const { doc, setDoc, serverTimestamp } = await import(
      "firebase/firestore"
    );
    const { db } = await import("@/lib/firebase");
    await setDoc(
      doc(db, root[0], root[1]),
      {
        timezone: settings.timezone,
        settings: { ...settings },
        templateId,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }

  return template;
}

export async function applyTemplateForUser(
  uid: string,
  templateId: SetupTemplateId,
  opts?: { setupDone?: boolean },
): Promise<SetupTemplate> {
  return applyTemplate(usersRoot(uid), templateId, opts);
}

/** Strings that must never appear in committed templates (privacy guard). */
export const TEMPLATE_PRIVACY_MARKERS = [
  "phanindra",
  "asvn",
  "@gmail.com",
  "@yahoo.com",
  "home address",
  "real name",
] as const;

export function templateContainsPrivacyMarker(
  template: SetupTemplate,
  markers: readonly string[] = TEMPLATE_PRIVACY_MARKERS,
): string | null {
  const blob = JSON.stringify(template).toLowerCase();
  for (const marker of markers) {
    if (blob.includes(marker.toLowerCase())) return marker;
  }
  return null;
}
