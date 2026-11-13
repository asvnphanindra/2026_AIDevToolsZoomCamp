import {
  collection,
  doc,
  getDocs,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";
import type { SeedArea } from "@/data/fictional-seed";
import {
  addDaysToDateKey,
  HORIZON_DEFAULT_DAYS,
  type AreaGoal,
  type GoalHorizonKind,
} from "@/lib/area-goals";
import type { PlacedBlock } from "@/lib/blocks";
import type { CalendarEvent } from "@/lib/calendar-events";
import type { CalendarSeries, SeriesRule } from "@/lib/calendar-series";
import type { BlockCheckIn } from "@/lib/checkin";
import { db } from "@/lib/firebase";
import type { FocusItem } from "@/lib/focus";
import type { DailyRule } from "@/lib/rules";
import { DEMO_COLLECTION } from "@/lib/seed";
import type { BacklogTask } from "@/lib/tasks";
import { dateKeyInTz, DEFAULT_TZ } from "@/lib/time";
import type { WeekHorizonItem } from "@/lib/week-horizon";

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

function isDateKey(value: unknown): value is string {
  return typeof value === "string" && DATE_KEY_RE.test(value);
}

/** Prefer absolute YYYY-MM-DD; else resolve dayOffset relative to today. */
function resolveDateKey(
  absolute: unknown,
  offset: unknown,
  todayKey: string,
): string | undefined {
  if (isDateKey(absolute)) return absolute;
  if (offset != null && offset !== "" && Number.isFinite(Number(offset))) {
    return addDaysToDateKey(todayKey, Number(offset));
  }
  return undefined;
}

export type DemoPlannerState = {
  areas: SeedArea[];
  tasks: BacklogTask[];
  blocks: PlacedBlock[];
  rules: DailyRule[];
  focusItems: FocusItem[];
  weekHorizon: WeekHorizonItem[];
  areaGoals: AreaGoal[];
  events: CalendarEvent[];
  series: CalendarSeries[];
  checkIns: Record<string, BlockCheckIn>;
};

type IdRow = Record<string, unknown> & { id: string };

function rootPath(uid: string): readonly [string, string] {
  return [DEMO_COLLECTION, uid];
}

async function listDocs(
  uid: string,
  name: string,
): Promise<Array<DocumentData & { id: string }>> {
  const [col, id] = rootPath(uid);
  const snap = await getDocs(collection(db, col, id, name));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

function omitUndefined(
  fields: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) out[key] = value;
  }
  return out;
}

/** Replace a whole id-keyed subcollection under demo/{uid}. */
export async function replaceDemoCollection(
  uid: string,
  name: string,
  rows: IdRow[],
): Promise<void> {
  const [col, id] = rootPath(uid);
  const existing = await getDocs(collection(db, col, id, name));
  const keep = new Set(rows.map((r) => r.id));
  const batch = writeBatch(db);

  for (const d of existing.docs) {
    if (!keep.has(d.id)) batch.delete(d.ref);
  }
  for (const row of rows) {
    const { id: docId, ...fields } = row;
    batch.set(doc(db, col, id, name, docId), omitUndefined(fields));
  }
  await batch.commit();
}

export async function replaceDemoCheckIns(
  uid: string,
  map: Record<string, BlockCheckIn>,
): Promise<void> {
  const rows = Object.values(map).map((c) => ({
    id: c.blockId,
    ...c,
  }));
  await replaceDemoCollection(uid, "checkIns", rows);
}

function asAreas(rows: Array<DocumentData & { id: string }>): SeedArea[] {
  return rows
    .map((d) => ({
      id: d.id,
      name: String(d["name"] ?? d.id),
      colour: String(d["colour"] ?? "#666"),
      order: Number(d["order"] ?? 0),
    }))
    .sort((a, b) => a.order - b.order);
}

function asTasks(rows: Array<DocumentData & { id: string }>): BacklogTask[] {
  return rows.map((d) => ({
    id: d.id,
    title: String(d["title"] ?? ""),
    areaId: String(d["areaId"] ?? ""),
    durationMin: Number(d["durationMin"] ?? 30),
    priority: String(d["priority"] ?? "med"),
    status: String(d["status"] ?? "backlog"),
    horizon: String(d["horizon"] ?? "day"),
    deepWork: Boolean(d["deepWork"]),
    due: d["due"] != null ? String(d["due"]) : undefined,
    period: d["period"] != null ? String(d["period"]) : undefined,
    goalId: d["goalId"] != null ? String(d["goalId"]) : undefined,
    replan: d["replan"] != null ? Boolean(d["replan"]) : undefined,
  }));
}

function asBlocks(rows: Array<DocumentData & { id: string }>): PlacedBlock[] {
  const todayKey = dateKeyInTz(new Date(), DEFAULT_TZ);
  const out: PlacedBlock[] = [];
  for (const d of rows) {
    const date = resolveDateKey(d["date"], d["dayOffset"], todayKey);
    if (!date) continue;
    const block: PlacedBlock = {
      id: d.id,
      taskId: String(d["taskId"] ?? ""),
      title: String(d["title"] ?? ""),
      areaId: String(d["areaId"] ?? ""),
      colour: String(d["colour"] ?? "#666"),
      date,
      start: String(d["start"] ?? "09:00"),
      end: String(d["end"] ?? "10:00"),
    };
    if (d["deepWork"] != null) block.deepWork = Boolean(d["deepWork"]);
    out.push(block);
  }
  return out;
}

function asRules(rows: Array<DocumentData & { id: string }>): DailyRule[] {
  return rows.map((d) => ({
    id: d.id,
    areaId: String(d["areaId"] ?? ""),
    label: String(d["label"] ?? ""),
    minMinutesPerDay: Number(d["minMinutesPerDay"] ?? 0),
  }));
}

function asFocus(rows: Array<DocumentData & { id: string }>): FocusItem[] {
  return rows.map((d) => ({
    id: d.id,
    areaId: String(d["areaId"] ?? ""),
    title: String(d["title"] ?? ""),
    subtitle: d["subtitle"] != null ? String(d["subtitle"]) : undefined,
    order: Number(d["order"] ?? 0),
  }));
}

function asWeekHorizon(
  rows: Array<DocumentData & { id: string }>,
): WeekHorizonItem[] {
  return rows.map((d) => ({ ...(d as unknown as WeekHorizonItem), id: d.id }));
}

function asAreaGoals(rows: Array<DocumentData & { id: string }>): AreaGoal[] {
  const todayKey = dateKeyInTz(new Date(), DEFAULT_TZ);
  const out: AreaGoal[] = [];
  for (const d of rows) {
    const horizon = (d["horizon"] as GoalHorizonKind) ?? "short";
    const startDate = resolveDateKey(
      d["startDate"],
      d["startOffsetDays"],
      todayKey,
    );
    const endDate =
      resolveDateKey(d["endDate"], d["endOffsetDays"], todayKey) ??
      (startDate
        ? addDaysToDateKey(
            startDate,
            HORIZON_DEFAULT_DAYS[horizon] ?? HORIZON_DEFAULT_DAYS.short,
          )
        : undefined);
    if (!startDate || !endDate) continue;
    const goal: AreaGoal = {
      id: d.id,
      areaId: String(d["areaId"] ?? ""),
      title: String(d["title"] ?? ""),
      horizon,
      startDate,
      endDate: endDate < startDate ? startDate : endDate,
    };
    if (d["progress"] != null) goal.progress = Number(d["progress"]);
    out.push(goal);
  }
  return out;
}

function asEvents(rows: Array<DocumentData & { id: string }>): CalendarEvent[] {
  const todayKey = dateKeyInTz(new Date(), DEFAULT_TZ);
  const out: CalendarEvent[] = [];
  for (const d of rows) {
    const date = resolveDateKey(d["date"], d["dayOffset"], todayKey);
    if (!date) continue;
    const event: CalendarEvent = {
      id: d.id,
      date,
      kind: (d["kind"] as CalendarEvent["kind"]) ?? "appointment",
      label: String(d["label"] ?? ""),
    };
    const endDate = resolveDateKey(d["endDate"], d["endDayOffset"], todayKey);
    if (endDate) event.endDate = endDate;
    if (d["time"] != null) event.time = String(d["time"]);
    if (d["seriesId"] != null) event.seriesId = String(d["seriesId"]);
    out.push(event);
  }
  return out;
}

function asSeries(
  rows: Array<DocumentData & { id: string }>,
): CalendarSeries[] {
  const todayKey = dateKeyInTz(new Date(), DEFAULT_TZ);
  const out: CalendarSeries[] = [];
  for (const d of rows) {
    const startDate = resolveDateKey(
      d["startDate"],
      d["startDayOffset"],
      todayKey,
    );
    const rule = d["rule"] as SeriesRule | undefined;
    if (!startDate || !rule || typeof rule !== "object") continue;
    const series: CalendarSeries = {
      id: d.id,
      label: String(d["label"] ?? ""),
      kind: (d["kind"] as CalendarSeries["kind"]) ?? "series",
      rule,
      startDate,
      paused: Boolean(d["paused"]),
    };
    if (d["time"] != null) series.time = String(d["time"]);
    out.push(series);
  }
  return out;
}

function asCheckIns(
  rows: Array<DocumentData & { id: string }>,
): Record<string, BlockCheckIn> {
  const map: Record<string, BlockCheckIn> = {};
  for (const d of rows) {
    const blockId = String(d["blockId"] ?? d.id);
    map[blockId] = {
      blockId,
      outcome: (d["outcome"] as BlockCheckIn["outcome"]) ?? "done",
      remainingMin:
        d["remainingMin"] != null ? Number(d["remainingMin"]) : undefined,
      checkedAt: String(d["checkedAt"] ?? ""),
    };
  }
  return map;
}

/** Load mutable planner state from demo/{uid}/… (after seed). */
export async function loadDemoPlannerState(
  uid: string,
): Promise<DemoPlannerState> {
  const [
    areas,
    tasks,
    blocks,
    rules,
    focusItems,
    weekHorizon,
    areaGoals,
    events,
    series,
    checkInRows,
  ] = await Promise.all([
    listDocs(uid, "areas").then(asAreas),
    listDocs(uid, "tasks").then(asTasks),
    listDocs(uid, "blocks").then(asBlocks),
    listDocs(uid, "rules").then(asRules),
    listDocs(uid, "focusItems").then(asFocus),
    listDocs(uid, "weekHorizon").then(asWeekHorizon),
    listDocs(uid, "areaGoals").then(asAreaGoals),
    listDocs(uid, "events").then(asEvents),
    listDocs(uid, "series").then(asSeries),
    listDocs(uid, "checkIns").then(asCheckIns),
  ]);

  return {
    areas,
    tasks,
    blocks,
    rules,
    focusItems,
    weekHorizon,
    areaGoals,
    events,
    series,
    checkIns: checkInRows,
  };
}
