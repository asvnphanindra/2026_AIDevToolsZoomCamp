import {
  collection,
  doc,
  getDocs,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";
import type { SeedArea } from "@/data/fictional-seed";
import type { AreaGoal } from "@/lib/area-goals";
import type { PlacedBlock } from "@/lib/blocks";
import type { CalendarEvent } from "@/lib/calendar-events";
import type { CalendarSeries } from "@/lib/calendar-series";
import type { BlockCheckIn } from "@/lib/checkin";
import { db } from "@/lib/firebase";
import type { FocusItem } from "@/lib/focus";
import type { DailyRule } from "@/lib/rules";
import { DEMO_COLLECTION } from "@/lib/seed";
import type { BacklogTask } from "@/lib/tasks";
import type { WeekHorizonItem } from "@/lib/week-horizon";

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
  return rows.map((d) => ({
    id: d.id,
    taskId: String(d["taskId"] ?? ""),
    title: String(d["title"] ?? ""),
    areaId: String(d["areaId"] ?? ""),
    colour: String(d["colour"] ?? "#666"),
    date: String(d["date"] ?? ""),
    start: String(d["start"] ?? ""),
    end: String(d["end"] ?? ""),
    deepWork: d["deepWork"] != null ? Boolean(d["deepWork"]) : undefined,
  }));
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
  return rows.map((d) => ({
    id: d.id,
    areaId: String(d["areaId"] ?? ""),
    title: String(d["title"] ?? ""),
    horizon: (d["horizon"] as AreaGoal["horizon"]) ?? "short",
    startDate: String(d["startDate"] ?? ""),
    endDate: String(d["endDate"] ?? ""),
    progress:
      d["progress"] != null ? Number(d["progress"]) : undefined,
  }));
}

function asEvents(rows: Array<DocumentData & { id: string }>): CalendarEvent[] {
  return rows.map((d) => ({
    ...(d as unknown as CalendarEvent),
    id: d.id,
  }));
}

function asSeries(
  rows: Array<DocumentData & { id: string }>,
): CalendarSeries[] {
  return rows.map((d) => ({
    ...(d as unknown as CalendarSeries),
    id: d.id,
  }));
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
