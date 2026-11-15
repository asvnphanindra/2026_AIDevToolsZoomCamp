import {
  collection,
  doc,
  getDoc,
  getDocs,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";
import type { SeedArea } from "@/data/fictional-seed";
import { db } from "@/lib/firebase";
import { DEMO_COLLECTION } from "@/lib/seed";
import { addDaysToDateKey } from "@/lib/area-goals";
import { dateKeyInTz, DEFAULT_TZ } from "@/lib/time";

export const JOB_AREA_ID = "work";
export const DEFAULT_TEACHING_PLAN_ID = "job-default";

const LOCAL_KEY = "work-planner.teaching-plan";

export type TeachingSection = {
  id: string;
  name: string;
  order: number;
};

export type TeachingTopic = {
  id: string;
  title: string;
  order: number;
};

/** Coverage + derived schedule hint for one topic × section cell. */
export type TopicSectionMapping = {
  id: string;
  topicId: string;
  sectionId: string;
  coveragePercent: number;
  /** Derived YYYY-MM-DD from cascade / active timetable. */
  plannedDate?: string;
  /** Derived weekday 0=Sun … 6=Sat. */
  plannedDayOfWeek?: number;
};

export type TimetableSlot = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  sectionId: string;
};

export type TimetableVersion = {
  id: string;
  name: string;
  effectiveFrom: string;
  effectiveTo?: string;
  slots: TimetableSlot[];
};

export type TeachingPlanDoc = {
  id: string;
  areaId: string;
  semesterStart: string;
  semesterEnd: string;
  sectionIds: string[];
};

export type TeachingPlanState = TeachingPlanDoc & {
  sections: TeachingSection[];
  topics: TeachingTopic[];
  mappings: TopicSectionMapping[];
  timetables: TimetableVersion[];
};

/**
 * Job / teaching area. Seed id is historically `work` (display name Job);
 * also accept id/name `job`, and legacy display name `Work`.
 */
export function isJobArea(area: Pick<SeedArea, "id" | "name">): boolean {
  const id = area.id.trim().toLowerCase();
  const name = area.name.trim().toLowerCase();
  return id === "job" || id === "work" || name === "job" || name === "work";
}

/** Prefer Job-named area, else first matching isJobArea. */
export function findJobArea(
  areas: ReadonlyArray<Pick<SeedArea, "id" | "name" | "order">>,
): (Pick<SeedArea, "id" | "name" | "order">) | undefined {
  const matches = areas.filter(isJobArea);
  if (!matches.length) return undefined;
  const namedJob = matches.find(
    (a) => a.name.trim().toLowerCase() === "job" || a.id === "job",
  );
  return namedJob ?? matches[0];
}

export function mappingId(topicId: string, sectionId: string): string {
  return `${topicId}__${sectionId}`;
}

export function dayOfWeekFromDateKey(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!, 12, 0, 0)).getUTCDay();
}

/** Active timetable for a date inside the semester (one version). */
export function activeTimetable(
  timetables: TimetableVersion[],
  dateKey: string,
  semesterStart: string,
  semesterEnd: string,
): TimetableVersion | null {
  if (dateKey < semesterStart || dateKey > semesterEnd) return null;
  const candidates = timetables.filter((t) => {
    if (dateKey < t.effectiveFrom) return false;
    if (t.effectiveTo && dateKey > t.effectiveTo) return false;
    return true;
  });
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  return candidates[0] ?? null;
}

/** Upcoming section slots from active timetable starting at `fromDate` (inclusive). */
export function upcomingSectionSlots(
  timetable: TimetableVersion,
  sectionId: string,
  fromDate: string,
  semesterEnd: string,
  limit = 40,
): Array<{ date: string; dayOfWeek: number; startTime: string; endTime: string }> {
  const out: Array<{
    date: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }> = [];
  let cursor = fromDate;
  let guard = 0;
  while (cursor <= semesterEnd && out.length < limit && guard < 400) {
    guard += 1;
    const dow = dayOfWeekFromDateKey(cursor);
    for (const slot of timetable.slots) {
      if (slot.sectionId !== sectionId || slot.dayOfWeek !== dow) continue;
      out.push({
        date: cursor,
        dayOfWeek: dow,
        startTime: slot.startTime,
        endTime: slot.endTime,
      });
      if (out.length >= limit) break;
    }
    cursor = addDaysToDateKey(cursor, 1);
  }
  return out;
}

function ensureMapping(
  mappings: TopicSectionMapping[],
  topicId: string,
  sectionId: string,
): TopicSectionMapping {
  const id = mappingId(topicId, sectionId);
  const existing = mappings.find((m) => m.id === id);
  if (existing) return existing;
  const created: TopicSectionMapping = {
    id,
    topicId,
    sectionId,
    coveragePercent: 0,
  };
  mappings.push(created);
  return created;
}

/**
 * Set coverage on (topic, section). At 100%, advance the next unfinished topic
 * onto upcoming active-timetable slots and recompute derived planned dates for
 * later rows. Never deletes mappings.
 */
export function setCoverageAndCascade(
  state: TeachingPlanState,
  topicId: string,
  sectionId: string,
  coveragePercent: number,
  asOfDate?: string,
): TeachingPlanState {
  const pct = Math.max(0, Math.min(100, Math.round(coveragePercent)));
  const topics = [...state.topics].sort((a, b) => a.order - b.order);
  const mappings = state.mappings.map((m) => ({ ...m }));
  const cell = ensureMapping(mappings, topicId, sectionId);
  cell.coveragePercent = pct;

  const asOf =
    asOfDate ??
    dateKeyInTz(new Date(), DEFAULT_TZ);
  const active = activeTimetable(
    state.timetables,
    asOf < state.semesterStart ? state.semesterStart : asOf,
    state.semesterStart,
    state.semesterEnd,
  );

  if (pct >= 100 && active) {
    const topicIndex = topics.findIndex((t) => t.id === topicId);
    const later = topics.slice(Math.max(0, topicIndex + 1));
    const unfinished = later.filter((t) => {
      const m = ensureMapping(mappings, t.id, sectionId);
      return m.coveragePercent < 100;
    });

    const startFrom = addDaysToDateKey(asOf, 1);
    const slots = upcomingSectionSlots(
      active,
      sectionId,
      startFrom,
      state.semesterEnd,
      Math.max(unfinished.length, 1),
    );

    unfinished.forEach((topic, i) => {
      const m = ensureMapping(mappings, topic.id, sectionId);
      const slot = slots[i];
      if (!slot) {
        m.plannedDate = undefined;
        m.plannedDayOfWeek = undefined;
        return;
      }
      m.plannedDate = slot.date;
      m.plannedDayOfWeek = slot.dayOfWeek;
    });
  }

  // Always refresh derived dates for unfinished topics after the edited one.
  if (active) {
    const topicIndex = topics.findIndex((t) => t.id === topicId);
    const later = topics.slice(Math.max(0, topicIndex + (pct >= 100 ? 1 : 0)));
    const unfinished = later.filter((t) => {
      const m = ensureMapping(mappings, t.id, sectionId);
      return m.coveragePercent < 100;
    });
    const startFrom =
      pct >= 100 ? addDaysToDateKey(asOf, 1) : asOf < state.semesterStart
        ? state.semesterStart
        : asOf;
    const slots = upcomingSectionSlots(
      active,
      sectionId,
      startFrom,
      state.semesterEnd,
      Math.max(unfinished.length, 1),
    );
    unfinished.forEach((topic, i) => {
      const m = ensureMapping(mappings, topic.id, sectionId);
      const slot = slots[i];
      if (!slot) {
        m.plannedDate = undefined;
        m.plannedDayOfWeek = undefined;
        return;
      }
      m.plannedDate = slot.date;
      m.plannedDayOfWeek = slot.dayOfWeek;
    });
  }

  return {
    ...state,
    mappings,
    sectionIds: state.sections.map((s) => s.id),
  };
}

export function coverageFor(
  mappings: TopicSectionMapping[],
  topicId: string,
  sectionId: string,
): number {
  return (
    mappings.find((m) => m.topicId === topicId && m.sectionId === sectionId)
      ?.coveragePercent ?? 0
  );
}

export function seedTeachingPlan(
  areaId = JOB_AREA_ID,
  from = new Date(),
  timeZone = DEFAULT_TZ,
): TeachingPlanState {
  const semesterStart = dateKeyInTz(from, timeZone);
  // ~16 teaching weeks
  const semesterEnd = addDaysToDateKey(semesterStart, 16 * 7 - 1);
  const sections: TeachingSection[] = [
    { id: "sec-a", name: "Section A", order: 1 },
    { id: "sec-b", name: "Section B", order: 2 },
  ];
  const topics: TeachingTopic[] = [
    { id: "topic-intro", title: "Course intro & syllabus", order: 1 },
    { id: "topic-basics", title: "Core concepts", order: 2 },
    { id: "topic-practice", title: "Guided practice", order: 3 },
    { id: "topic-project", title: "Capstone project", order: 4 },
  ];
  const mappings: TopicSectionMapping[] = [];
  for (const topic of topics) {
    for (const section of sections) {
      mappings.push({
        id: mappingId(topic.id, section.id),
        topicId: topic.id,
        sectionId: section.id,
        coveragePercent: 0,
      });
    }
  }
  const timetables: TimetableVersion[] = [
    {
      id: "tt-v1",
      name: "Semester default",
      effectiveFrom: semesterStart,
      effectiveTo: semesterEnd,
      slots: [
        {
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "10:30",
          sectionId: "sec-a",
        },
        {
          dayOfWeek: 3,
          startTime: "09:00",
          endTime: "10:30",
          sectionId: "sec-a",
        },
        {
          dayOfWeek: 2,
          startTime: "11:00",
          endTime: "12:30",
          sectionId: "sec-b",
        },
        {
          dayOfWeek: 4,
          startTime: "11:00",
          endTime: "12:30",
          sectionId: "sec-b",
        },
      ],
    },
  ];
  return {
    id: DEFAULT_TEACHING_PLAN_ID,
    areaId,
    semesterStart,
    semesterEnd,
    sectionIds: sections.map((s) => s.id),
    sections,
    topics,
    mappings,
    timetables,
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

/** Persist teaching plan + subcollections under users|demo/{uid}/teachingPlans/{id}. */
export async function writeTeachingPlanRemote(
  ownerUid: string,
  state: TeachingPlanState,
  isDemo: boolean,
): Promise<void> {
  const [col, uid] = rootParts(ownerUid, isDemo);
  const planRef = doc(db, col, uid, "teachingPlans", state.id);
  const batch = writeBatch(db);
  batch.set(
    planRef,
    omitUndefined({
      areaId: state.areaId,
      semesterStart: state.semesterStart,
      semesterEnd: state.semesterEnd,
      sectionIds: state.sections.map((s) => s.id),
      sections: state.sections,
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
    "mappings",
    state.mappings.map((m) => ({ ...m })),
  );
  await replaceSub(
    "timetables",
    state.timetables.map((t) => ({ ...t })),
  );
  await batch.commit();
}

export async function loadTeachingPlanRemote(
  ownerUid: string,
  planId: string,
  isDemo: boolean,
): Promise<TeachingPlanState | null> {
  const [col, uid] = rootParts(ownerUid, isDemo);
  const planSnap = await getDoc(doc(db, col, uid, "teachingPlans", planId));
  if (!planSnap.exists()) return null;
  const data = planSnap.data();
  const [topics, mappings, timetables] = await Promise.all([
    getDocs(collection(db, col, uid, "teachingPlans", planId, "topics")),
    getDocs(collection(db, col, uid, "teachingPlans", planId, "mappings")),
    getDocs(collection(db, col, uid, "teachingPlans", planId, "timetables")),
  ]);

  const sections = Array.isArray(data["sections"])
    ? (data["sections"] as TeachingSection[])
    : [];

  return {
    id: planId,
    areaId: String(data["areaId"] ?? JOB_AREA_ID),
    semesterStart: String(data["semesterStart"] ?? ""),
    semesterEnd: String(data["semesterEnd"] ?? ""),
    sectionIds: Array.isArray(data["sectionIds"])
      ? (data["sectionIds"] as string[])
      : sections.map((s) => s.id),
    sections,
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
    mappings: mappings.docs.map((d) => {
      const row = d.data();
      return {
        id: d.id,
        topicId: String(row["topicId"] ?? ""),
        sectionId: String(row["sectionId"] ?? ""),
        coveragePercent: Number(row["coveragePercent"] ?? 0),
        plannedDate:
          row["plannedDate"] != null ? String(row["plannedDate"]) : undefined,
        plannedDayOfWeek:
          row["plannedDayOfWeek"] != null
            ? Number(row["plannedDayOfWeek"])
            : undefined,
      };
    }),
    timetables: timetables.docs.map((d) => {
      const row = d.data();
      return {
        id: d.id,
        name: String(row["name"] ?? d.id),
        effectiveFrom: String(row["effectiveFrom"] ?? ""),
        effectiveTo:
          row["effectiveTo"] != null ? String(row["effectiveTo"]) : undefined,
        slots: Array.isArray(row["slots"])
          ? (row["slots"] as TimetableSlot[])
          : [],
      };
    }),
  };
}

export function readLocalTeachingPlan(): TeachingPlanState | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TeachingPlanState;
  } catch {
    return null;
  }
}

export function writeLocalTeachingPlan(state: TeachingPlanState): void {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
}

/** Load or seed Job teaching plan (localStorage personal fallback; Firestore preferred). */
export async function loadOrSeedTeachingPlan(opts: {
  ownerUid: string;
  isDemo: boolean;
  areaId?: string;
}): Promise<TeachingPlanState> {
  const areaId = opts.areaId ?? JOB_AREA_ID;
  try {
    const remote = await loadTeachingPlanRemote(
      opts.ownerUid,
      DEFAULT_TEACHING_PLAN_ID,
      opts.isDemo,
    );
    if (remote) return remote;
    const seeded = seedTeachingPlan(areaId);
    await writeTeachingPlanRemote(opts.ownerUid, seeded, opts.isDemo);
    if (!opts.isDemo && typeof localStorage !== "undefined") {
      writeLocalTeachingPlan(seeded);
    }
    return seeded;
  } catch {
    if (!opts.isDemo && typeof localStorage !== "undefined") {
      const local = readLocalTeachingPlan();
      if (local) return local;
      const seeded = seedTeachingPlan(areaId);
      writeLocalTeachingPlan(seeded);
      return seeded;
    }
    return seedTeachingPlan(areaId);
  }
}

export async function persistTeachingPlan(opts: {
  ownerUid: string;
  isDemo: boolean;
  state: TeachingPlanState;
}): Promise<void> {
  if (!opts.isDemo && typeof localStorage !== "undefined") {
    writeLocalTeachingPlan(opts.state);
  }
  try {
    await writeTeachingPlanRemote(opts.ownerUid, opts.state, opts.isDemo);
  } catch {
    // Local already saved for personal; demo callers should surface errors.
    if (opts.isDemo) throw new Error("Failed to save teaching plan to Firestore");
  }
}
