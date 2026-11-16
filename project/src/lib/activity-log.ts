import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DEMO_COLLECTION } from "@/lib/seed";

export type ActorRole = "owner" | "bot" | "human";

export type ActivityEntry = {
  id: string;
  at: string;
  actorUid: string;
  actorLabel: string;
  actorRole: ActorRole;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
};

export type ActivityActor = {
  uid: string;
  label: string;
  role: ActorRole;
};

export type ActivityFilter = {
  role?: ActorRole | "all";
  entityType?: string | "all";
  /** Inclusive YYYY-MM-DD (UTC date of entry.at). */
  from?: string;
  /** Inclusive YYYY-MM-DD (UTC date of entry.at). */
  to?: string;
  /** Hide create/add + delete/remove pairs on the same entityId. */
  hideNetZero?: boolean;
};

const CREATE_ACTIONS = new Set(["create", "add"]);
const DELETE_ACTIONS = new Set(["delete", "remove"]);

function entryDateKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

/** Hide matched create↔delete pairs per entityId (chronological pairing). */
export function hideNetZeroPairs(entries: ActivityEntry[]): ActivityEntry[] {
  const byEntity = new Map<string, ActivityEntry[]>();
  for (const e of entries) {
    const list = byEntity.get(e.entityId) ?? [];
    list.push(e);
    byEntity.set(e.entityId, list);
  }
  const hide = new Set<string>();
  for (const list of byEntity.values()) {
    const ordered = [...list].sort((a, b) => a.at.localeCompare(b.at));
    const creates: ActivityEntry[] = [];
    for (const e of ordered) {
      const action = e.action.toLowerCase();
      if (CREATE_ACTIONS.has(action)) {
        creates.push(e);
        continue;
      }
      if (DELETE_ACTIONS.has(action) && creates.length) {
        const created = creates.shift()!;
        hide.add(created.id);
        hide.add(e.id);
      }
    }
  }
  return entries.filter((e) => !hide.has(e.id));
}

/** Pure client-side activity filter (no writes). */
export function filterActivity(
  entries: ActivityEntry[],
  filter: ActivityFilter,
): ActivityEntry[] {
  let out = entries;
  if (filter.role && filter.role !== "all") {
    out = out.filter((e) => e.actorRole === filter.role);
  }
  if (filter.entityType && filter.entityType !== "all") {
    out = out.filter((e) => e.entityType === filter.entityType);
  }
  if (filter.from) {
    out = out.filter((e) => entryDateKey(e.at) >= filter.from!);
  }
  if (filter.to) {
    out = out.filter((e) => entryDateKey(e.at) <= filter.to!);
  }
  if (filter.hideNetZero) {
    out = hideNetZeroPairs(out);
  }
  return out;
}

const LOCAL_KEY = "work-planner.activity-log";
const MAX_LOCAL = 200;

function rootParts(
  ownerUid: string,
  isDemo: boolean,
): readonly [string, string] {
  return isDemo ? [DEMO_COLLECTION, ownerUid] : ["users", ownerUid];
}

export function newActivityId(at = new Date()): string {
  return `act-${at.getTime().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Pure helper: prepend a new entry (append-only log, newest first in UI). */
export function appendActivityLocal(
  entries: ActivityEntry[],
  input: Omit<ActivityEntry, "id" | "at"> & { id?: string; at?: string },
): ActivityEntry[] {
  const at = input.at ?? new Date().toISOString();
  const entry: ActivityEntry = {
    id: input.id ?? newActivityId(new Date(at)),
    at,
    actorUid: input.actorUid,
    actorLabel: input.actorLabel,
    actorRole: input.actorRole,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    summary: input.summary,
  };
  return [entry, ...entries].slice(0, MAX_LOCAL);
}

export function readLocalActivity(): ActivityEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ActivityEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeLocalActivity(entries: ActivityEntry[]): void {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(entries.slice(0, MAX_LOCAL)));
}

/** Append-only write to users|demo/{ownerUid}/activityLog/{entryId}. */
export async function appendActivity(opts: {
  ownerUid: string;
  isDemo: boolean;
  actor: ActivityActor;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
}): Promise<ActivityEntry> {
  const at = new Date().toISOString();
  const entry: ActivityEntry = {
    id: newActivityId(new Date(at)),
    at,
    actorUid: opts.actor.uid,
    actorLabel: opts.actor.label,
    actorRole: opts.actor.role,
    action: opts.action,
    entityType: opts.entityType,
    entityId: opts.entityId,
    summary: opts.summary,
  };

  if (!opts.isDemo && typeof localStorage !== "undefined") {
    writeLocalActivity(appendActivityLocal(readLocalActivity(), entry));
  }

  try {
    const [col, uid] = rootParts(opts.ownerUid, opts.isDemo);
    await setDoc(doc(db, col, uid, "activityLog", entry.id), entry);
  } catch {
    if (opts.isDemo) {
      throw new Error("Failed to append activity log");
    }
  }
  return entry;
}

export async function loadActivityLog(opts: {
  ownerUid: string;
  isDemo: boolean;
  max?: number;
}): Promise<ActivityEntry[]> {
  const max = opts.max ?? 100;
  try {
    const [col, uid] = rootParts(opts.ownerUid, opts.isDemo);
    const snap = await getDocs(
      query(
        collection(db, col, uid, "activityLog"),
        orderBy("at", "desc"),
        limit(max),
      ),
    );
    if (snap.size) {
      return snap.docs.map((d) => {
        const row = d.data();
        return {
          id: d.id,
          at: String(row["at"] ?? ""),
          actorUid: String(row["actorUid"] ?? ""),
          actorLabel: String(row["actorLabel"] ?? ""),
          actorRole: (row["actorRole"] as ActorRole) || "human",
          action: String(row["action"] ?? ""),
          entityType: String(row["entityType"] ?? ""),
          entityId: String(row["entityId"] ?? ""),
          summary: String(row["summary"] ?? ""),
        };
      });
    }
  } catch {
    // fall through to local
  }
  if (!opts.isDemo && typeof localStorage !== "undefined") {
    return readLocalActivity().slice(0, max);
  }
  return [];
}
