import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  type DocumentData,
} from "firebase/firestore";
import type {
  SeedBand,
  SeedDayType,
  SeedRoutine,
  SeedSchedule,
} from "@/data/fictional-seed";
import { db } from "@/lib/firebase";
import { addDaysToDateKey } from "@/lib/area-goals";
import {
  replaceCollection,
  type PlannerRoot,
  usersRoot,
} from "@/lib/planner-store";
import { DEFAULT_TZ } from "@/lib/time";

/** Top-level users/{uid} settings (Phase 0.4 start). */
export type UserSettings = {
  timezone: string;
  gridStartHour: number;
  gridEndHour: number;
  daysVisible: number;
  checkInCadence: "after-block" | "timed" | "end-of-day";
  reminderDefaultMin: number;
  eveningReviewAt?: string;
  setupDone?: boolean;
  /** Setup template id when chosen (Phase 2). */
  templateId?: string;
};

export const DEFAULT_USER_SETTINGS: UserSettings = {
  timezone: DEFAULT_TZ,
  gridStartHour: 6,
  gridEndHour: 22,
  daysVisible: 5,
  checkInCadence: "after-block",
  reminderDefaultMin: 60,
};

/** Date-keyed day type (YYYY-MM-DD doc id). No dayOffset. */
export type ConfigDayType = {
  id: string;
  date: string;
  type: SeedDayType["type"];
  label: string;
  onlineSlots?: SeedDayType["onlineSlots"];
};

/** Date-keyed one-off schedule change. */
export type ConfigScheduleChange = {
  id: string;
  date: string;
  kind: "substitute" | "extra" | "cancel";
  title: string;
  start: string;
  end: string;
};

export type UserConfigBundle = {
  settings: UserSettings;
  bands: SeedBand[];
  routines: SeedRoutine[];
  schedules: SeedSchedule[];
  dayTypes: ConfigDayType[];
  scheduleChanges: ConfigScheduleChange[];
};

function omitUndefined(
  fields: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) out[key] = value;
  }
  return out;
}

function asBand(d: DocumentData & { id: string }): SeedBand {
  return {
    id: d.id,
    level: (d["level"] as SeedBand["level"]) ?? "medium",
    start: String(d["start"] ?? "09:00"),
    end: String(d["end"] ?? "10:00"),
    weekdays: Array.isArray(d["weekdays"])
      ? (d["weekdays"] as number[])
      : [],
  };
}

function asRoutine(d: DocumentData & { id: string }): SeedRoutine {
  return {
    id: d.id,
    label: String(d["label"] ?? ""),
    start: String(d["start"] ?? "08:00"),
    end: String(d["end"] ?? "09:00"),
    weekdays: Array.isArray(d["weekdays"])
      ? (d["weekdays"] as number[])
      : [],
  };
}

function asSchedule(d: DocumentData & { id: string }): SeedSchedule {
  return {
    id: d.id,
    title: String(d["title"] ?? ""),
    start: String(d["start"] ?? "09:00"),
    end: String(d["end"] ?? "10:00"),
    weekday: Number(d["weekday"] ?? 1),
    kind: String(d["kind"] ?? "class"),
    location: d["location"] != null ? String(d["location"]) : undefined,
  };
}

function asDayType(d: DocumentData & { id: string }): ConfigDayType | null {
  const date = String(d["date"] ?? d.id);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return {
    id: d.id,
    date,
    type: (d["type"] as ConfigDayType["type"]) ?? "normal",
    label: String(d["label"] ?? date),
    onlineSlots: Array.isArray(d["onlineSlots"])
      ? (d["onlineSlots"] as ConfigDayType["onlineSlots"])
      : undefined,
  };
}

function asScheduleChange(
  d: DocumentData & { id: string },
): ConfigScheduleChange | null {
  const date = String(d["date"] ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return {
    id: d.id,
    date,
    kind: (d["kind"] as ConfigScheduleChange["kind"]) ?? "extra",
    title: String(d["title"] ?? ""),
    start: String(d["start"] ?? "09:00"),
    end: String(d["end"] ?? "10:00"),
  };
}

async function listMapped<T>(
  root: PlannerRoot,
  name: string,
  map: (d: DocumentData & { id: string }) => T | null,
): Promise<T[]> {
  const [col, id] = root;
  const snap = await getDocs(collection(db, col, id, name));
  const out: T[] = [];
  for (const docSnap of snap.docs) {
    const row = map({ id: docSnap.id, ...docSnap.data() });
    if (row) out.push(row);
  }
  return out;
}

export function parseUserSettings(
  data: DocumentData | undefined,
): UserSettings {
  const nested = (data?.["settings"] as DocumentData | undefined) ?? {};
  return {
    timezone: String(data?.["timezone"] ?? nested["timezone"] ?? DEFAULT_TZ),
    gridStartHour: Number(
      nested["gridStartHour"] ?? DEFAULT_USER_SETTINGS.gridStartHour,
    ),
    gridEndHour: Number(
      nested["gridEndHour"] ?? DEFAULT_USER_SETTINGS.gridEndHour,
    ),
    daysVisible: Number(
      nested["daysVisible"] ?? DEFAULT_USER_SETTINGS.daysVisible,
    ),
    checkInCadence:
      (nested["checkInCadence"] as UserSettings["checkInCadence"]) ??
      DEFAULT_USER_SETTINGS.checkInCadence,
    reminderDefaultMin: Number(
      nested["reminderDefaultMin"] ??
        nested["reminderMinutes"] ??
        DEFAULT_USER_SETTINGS.reminderDefaultMin,
    ),
    eveningReviewAt:
      nested["eveningReviewAt"] != null
        ? String(nested["eveningReviewAt"])
        : undefined,
    setupDone: nested["setupDone"] != null ? Boolean(nested["setupDone"]) : undefined,
    templateId:
      nested["templateId"] != null
        ? String(nested["templateId"])
        : data?.["templateId"] != null
          ? String(data["templateId"])
          : undefined,
  };
}

export async function loadUserSettings(uid: string): Promise<UserSettings> {
  const snap = await getDoc(doc(db, "users", uid));
  return parseUserSettings(snap.data());
}

export async function saveUserSettings(
  uid: string,
  settings: UserSettings,
): Promise<void> {
  await setDoc(
    doc(db, "users", uid),
    {
      timezone: settings.timezone,
      settings: omitUndefined({ ...settings }),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

/** Load bands / routines / schedules / date-keyed day types for a root. */
export async function loadUserConfig(
  root: PlannerRoot,
): Promise<Omit<UserConfigBundle, "settings">> {
  const [bands, routines, schedules, dayTypes, scheduleChanges] =
    await Promise.all([
      listMapped(root, "bands", asBand),
      listMapped(root, "routines", asRoutine),
      listMapped(root, "schedule", asSchedule),
      listMapped(root, "dayTypes", asDayType),
      listMapped(root, "scheduleChanges", asScheduleChange),
    ]);
  return { bands, routines, schedules, dayTypes, scheduleChanges };
}

export async function loadPersonalConfig(
  uid: string,
): Promise<UserConfigBundle> {
  const root = usersRoot(uid);
  const [settings, rest] = await Promise.all([
    loadUserSettings(uid),
    loadUserConfig(root),
  ]);
  return { settings, ...rest };
}

export async function saveBands(
  root: PlannerRoot,
  bands: SeedBand[],
): Promise<void> {
  await replaceCollection(root, "bands", bands);
}

export async function saveRoutines(
  root: PlannerRoot,
  routines: SeedRoutine[],
): Promise<void> {
  await replaceCollection(root, "routines", routines);
}

export async function saveSchedules(
  root: PlannerRoot,
  schedules: SeedSchedule[],
): Promise<void> {
  await replaceCollection(root, "schedule", schedules);
}

export async function saveDayTypes(
  root: PlannerRoot,
  dayTypes: ConfigDayType[],
): Promise<void> {
  const rows = dayTypes.map((d) => ({
    id: d.id || d.date,
    date: d.date,
    type: d.type,
    label: d.label,
    onlineSlots: d.onlineSlots,
  }));
  await replaceCollection(root, "dayTypes", rows);
}

/** Convert offset-based seed day types to absolute date keys at seed time. */
export function datedDayTypesFromOffsets(
  offsets: SeedDayType[],
  todayKey: string,
): ConfigDayType[] {
  return offsets.map((d) => {
    const date = addDaysToDateKey(todayKey, d.dayOffset);
    return {
      id: date,
      date,
      type: d.type,
      label: d.label,
      onlineSlots: d.onlineSlots,
    };
  });
}

/** Lookup date-keyed config day type; falls back to offset seed types. */
export function dayTypeForDate(
  dateKey: string,
  todayKey: string,
  dated: ConfigDayType[],
  offsetTypes: SeedDayType[] = [],
): ConfigDayType | SeedDayType | undefined {
  const hit = dated.find((d) => d.date === dateKey);
  if (hit) return hit;
  const offset = dated.length
    ? undefined
    : offsetTypes.find((d) => addDaysToDateKey(todayKey, d.dayOffset) === dateKey);
  return offset;
}

export function configDayTypeKind(
  dt: ConfigDayType | SeedDayType | undefined,
): SeedDayType["type"] | undefined {
  return dt?.type;
}
