import {
  collection,
  doc,
  getDoc,
  getDocs,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";
import { addDaysToDateKey } from "@/lib/area-goals";
import { db } from "@/lib/firebase";
import { DEMO_COLLECTION } from "@/lib/seed";
import {
  activeTimetable,
  dayOfWeekFromDateKey,
  type TeachingSection,
  type TeachingTopic,
} from "@/lib/teaching-plan";
import { dateKeyInTz, DEFAULT_TZ } from "@/lib/time";
import { dayKeysForIsoWeek, mondayOfIsoWeek } from "@/lib/week-horizon";
import { isoWeekPeriod } from "@/lib/goals";

export const TLP_PLAN_ID = "tlp-default";
export const TLP_TOPIC_DRAG_MIME = "application/x-tlp-topic";

const LOCAL_KEY = "work-planner.tlp";

export type SlotKind = "class" | "lab" | "tutorial";

export type TlpSubject = {
  id: string;
  name: string;
  order: number;
};

export type TlpSlot = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  sectionId: string;
  subjectId: string;
  kind: SlotKind;
};

export type TlpTimetable = {
  id: string;
  name: string;
  effectiveFrom: string;
  effectiveTo?: string;
  slots: TlpSlot[];
};

export type TlpPlacement = {
  id: string;
  topicId: string;
  date: string;
  sectionId: string;
  coveragePercent: number;
  kind: SlotKind;
  slotId?: string;
};

export type TlpPlan = {
  id: string;
  semesterStart: string;
  semesterEnd: string;
  sections: TeachingSection[];
  subjects: TlpSubject[];
  topics: TeachingTopic[];
  timetables: TlpTimetable[];
  placements: TlpPlacement[];
};

export type TlpOccurrence = {
  id: string;
  date: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  sectionId: string;
  subjectId: string;
  kind: SlotKind;
  slotId: string;
  timetableId: string;
};

/** Clamp coverage to integer 0–100. */
export function clampCoverage(raw: number): number {
  if (!Number.isFinite(raw)) return 0;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

/** Parse pasted topics: one non-empty trimmed line → title. */
export function parseTopicsPaste(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/** Clamp a date into [semesterStart, semesterEnd]. */
export function clampToSemester(
  dateKey: string,
  semesterStart: string,
  semesterEnd: string,
): string {
  if (dateKey < semesterStart) return semesterStart;
  if (dateKey > semesterEnd) return semesterEnd;
  return dateKey;
}

/**
 * Expand versioned timetable slots into concrete occurrences across the semester.
 * Uses active timetable version boundaries (effectiveFrom/To ∩ semester).
 */
export function expandSlotOccurrences(
  plan: Pick<
    TlpPlan,
    "semesterStart" | "semesterEnd" | "timetables"
  >,
): TlpOccurrence[] {
  const out: TlpOccurrence[] = [];
  if (!plan.semesterStart || !plan.semesterEnd) return out;
  if (plan.semesterStart > plan.semesterEnd) return out;

  let cursor = plan.semesterStart;
  let guard = 0;
  while (cursor <= plan.semesterEnd && guard < 400) {
    guard += 1;
    const asTt = plan.timetables.map((t) => ({
      id: t.id,
      name: t.name,
      effectiveFrom: t.effectiveFrom,
      effectiveTo: t.effectiveTo,
      slots: t.slots.map((s) => ({
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        sectionId: s.sectionId,
      })),
    }));
    const active = activeTimetable(
      asTt,
      cursor,
      plan.semesterStart,
      plan.semesterEnd,
    );
    if (active) {
      const version = plan.timetables.find((t) => t.id === active.id);
      if (version) {
        const dow = dayOfWeekFromDateKey(cursor);
        for (const slot of version.slots) {
          if (slot.dayOfWeek !== dow) continue;
          out.push({
            id: `${version.id}:${slot.id}:${cursor}`,
            date: cursor,
            dayOfWeek: dow,
            startTime: slot.startTime,
            endTime: slot.endTime,
            sectionId: slot.sectionId,
            subjectId: slot.subjectId,
            kind: slot.kind ?? "class",
            slotId: slot.id,
            timetableId: version.id,
          });
        }
      }
    }
    cursor = addDaysToDateKey(cursor, 1);
  }
  return out;
}

/** ISO week period containing dateKey (clamped to semester for jump-today). */
export function weekPeriodForDate(
  dateKey: string,
  timeZone = DEFAULT_TZ,
): string {
  return isoWeekPeriod(new Date(`${dateKey}T12:00:00Z`), timeZone);
}

export function weekDayKeys(
  period: string,
  timeZone = DEFAULT_TZ,
): string[] {
  return dayKeysForIsoWeek(period, timeZone);
}

export function shiftWeekPeriod(period: string, deltaWeeks: number): string {
  const mon = mondayOfIsoWeek(period);
  mon.setUTCDate(mon.getUTCDate() + deltaWeeks * 7);
  return isoWeekPeriod(mon, "UTC");
}

export function placementId(
  topicId: string,
  sectionId: string,
  date: string,
  kind: SlotKind,
): string {
  return `${topicId}__${sectionId}__${date}__${kind}`;
}

export function seedTlpPlan(
  from = new Date(),
  timeZone = DEFAULT_TZ,
): TlpPlan {
  const semesterStart = dateKeyInTz(from, timeZone);
  const semesterEnd = addDaysToDateKey(semesterStart, 16 * 7 - 1);
  const sections: TeachingSection[] = [
    { id: "sec-a", name: "Section A", order: 1 },
    { id: "sec-b", name: "Section B", order: 2 },
    { id: "sec-c", name: "Section C", order: 3 },
  ];
  const subjects: TlpSubject[] = [
    { id: "sub-math", name: "Mathematics", order: 1 },
    { id: "sub-physics", name: "Physics", order: 2 },
  ];
  const timetables: TlpTimetable[] = [
    {
      id: "tt-v1",
      name: "Semester default",
      effectiveFrom: semesterStart,
      effectiveTo: semesterEnd,
      slots: [
        {
          id: "slot-a-mon",
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "10:30",
          sectionId: "sec-a",
          subjectId: "sub-math",
          kind: "class",
        },
        {
          id: "slot-a-wed",
          dayOfWeek: 3,
          startTime: "09:00",
          endTime: "10:30",
          sectionId: "sec-a",
          subjectId: "sub-math",
          kind: "class",
        },
        {
          id: "slot-b-tue",
          dayOfWeek: 2,
          startTime: "11:00",
          endTime: "12:30",
          sectionId: "sec-b",
          subjectId: "sub-physics",
          kind: "class",
        },
        {
          id: "slot-b-thu",
          dayOfWeek: 4,
          startTime: "11:00",
          endTime: "12:30",
          sectionId: "sec-b",
          subjectId: "sub-physics",
          kind: "class",
        },
        {
          id: "slot-c-fri",
          dayOfWeek: 5,
          startTime: "14:00",
          endTime: "15:30",
          sectionId: "sec-c",
          subjectId: "sub-math",
          kind: "lab",
        },
      ],
    },
  ];
  return {
    id: TLP_PLAN_ID,
    semesterStart,
    semesterEnd,
    sections,
    subjects,
    topics: [],
    timetables,
    placements: [],
  };
}

function omitUndefined(fields: Record<string, unknown>): DocumentData {
  const out: DocumentData = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

function rootParts(
  ownerUid: string,
  isDemo: boolean,
): readonly [string, string] {
  return isDemo ? [DEMO_COLLECTION, ownerUid] : ["users", ownerUid];
}

export async function writeTlpPlanRemote(
  ownerUid: string,
  state: TlpPlan,
  isDemo: boolean,
): Promise<void> {
  const [col, uid] = rootParts(ownerUid, isDemo);
  const planRef = doc(db, col, uid, "teachingPlans", state.id);
  const batch = writeBatch(db);
  batch.set(
    planRef,
    omitUndefined({
      kind: "tlp",
      semesterStart: state.semesterStart,
      semesterEnd: state.semesterEnd,
      sectionIds: state.sections.map((s) => s.id),
      sections: state.sections,
      subjects: state.subjects,
    }),
  );

  async function replaceSub(
    name: string,
    rows: Array<Record<string, unknown> & { id: string }>,
  ) {
    const existing = await getDocs(
      collection(db, col, uid, "teachingPlans", state.id, name),
    );
    const keep = new Set(rows.map((r) => r.id));
    for (const d of existing.docs) {
      if (!keep.has(d.id)) batch.delete(d.ref);
    }
    for (const row of rows) {
      const { id, ...fields } = row;
      batch.set(
        doc(db, col, uid, "teachingPlans", state.id, name, id),
        omitUndefined(fields),
      );
    }
  }

  await replaceSub(
    "topics",
    state.topics.map((t) => ({ ...t })),
  );
  await replaceSub(
    "timetables",
    state.timetables.map((t) => ({ ...t })),
  );
  await replaceSub(
    "placements",
    state.placements.map((p) => ({ ...p })),
  );
  await batch.commit();
}

export async function loadTlpPlanRemote(
  ownerUid: string,
  planId: string,
  isDemo: boolean,
): Promise<TlpPlan | null> {
  const [col, uid] = rootParts(ownerUid, isDemo);
  const planSnap = await getDoc(doc(db, col, uid, "teachingPlans", planId));
  if (!planSnap.exists()) return null;
  const data = planSnap.data();
  const [topics, timetables, placements] = await Promise.all([
    getDocs(collection(db, col, uid, "teachingPlans", planId, "topics")),
    getDocs(collection(db, col, uid, "teachingPlans", planId, "timetables")),
    getDocs(collection(db, col, uid, "teachingPlans", planId, "placements")),
  ]);

  const sections = Array.isArray(data["sections"])
    ? (data["sections"] as TeachingSection[])
    : [];
  const subjects = Array.isArray(data["subjects"])
    ? (data["subjects"] as TlpSubject[])
    : [];

  return {
    id: planId,
    semesterStart: String(data["semesterStart"] ?? ""),
    semesterEnd: String(data["semesterEnd"] ?? ""),
    sections,
    subjects,
    topics: topics.docs
      .map((d) => {
        const row = d.data();
        return {
          id: d.id,
          title: String(row["title"] ?? d.id),
          order: Number(row["order"] ?? 0),
        };
      })
      .sort((a, b) => a.order - b.order),
    timetables: timetables.docs.map((d) => {
      const row = d.data();
      const slots = Array.isArray(row["slots"])
        ? (row["slots"] as TlpSlot[]).map((s, i) => ({
            id: s.id || `slot-${d.id}-${i}`,
            dayOfWeek: Number(s.dayOfWeek),
            startTime: String(s.startTime ?? ""),
            endTime: String(s.endTime ?? ""),
            sectionId: String(s.sectionId ?? ""),
            subjectId: String(s.subjectId ?? ""),
            kind: (s.kind as SlotKind) || "class",
          }))
        : [];
      return {
        id: d.id,
        name: String(row["name"] ?? d.id),
        effectiveFrom: String(row["effectiveFrom"] ?? ""),
        effectiveTo:
          row["effectiveTo"] != null ? String(row["effectiveTo"]) : undefined,
        slots,
      };
    }),
    placements: placements.docs.map((d) => {
      const row = d.data();
      return {
        id: d.id,
        topicId: String(row["topicId"] ?? ""),
        date: String(row["date"] ?? ""),
        sectionId: String(row["sectionId"] ?? ""),
        coveragePercent: clampCoverage(Number(row["coveragePercent"] ?? 0)),
        kind: (row["kind"] as SlotKind) || "class",
        slotId: row["slotId"] != null ? String(row["slotId"]) : undefined,
      };
    }),
  };
}

export function readLocalTlpPlan(): TlpPlan | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TlpPlan;
  } catch {
    return null;
  }
}

export function writeLocalTlpPlan(state: TlpPlan): void {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
}

export async function loadOrSeedTlpPlan(opts: {
  ownerUid: string;
  isDemo: boolean;
}): Promise<TlpPlan> {
  try {
    const remote = await loadTlpPlanRemote(
      opts.ownerUid,
      TLP_PLAN_ID,
      opts.isDemo,
    );
    if (remote) return remote;
    const seeded = seedTlpPlan();
    await writeTlpPlanRemote(opts.ownerUid, seeded, opts.isDemo);
    if (!opts.isDemo && typeof localStorage !== "undefined") {
      writeLocalTlpPlan(seeded);
    }
    return seeded;
  } catch {
    if (!opts.isDemo && typeof localStorage !== "undefined") {
      const local = readLocalTlpPlan();
      if (local) return local;
      const seeded = seedTlpPlan();
      writeLocalTlpPlan(seeded);
      return seeded;
    }
    return seedTlpPlan();
  }
}

export async function persistTlpPlan(opts: {
  ownerUid: string;
  isDemo: boolean;
  state: TlpPlan;
}): Promise<void> {
  if (!opts.isDemo && typeof localStorage !== "undefined") {
    writeLocalTlpPlan(opts.state);
  }
  try {
    await writeTlpPlanRemote(opts.ownerUid, opts.state, opts.isDemo);
  } catch {
    if (opts.isDemo) throw new Error("Failed to save TLP plan to Firestore");
  }
}
