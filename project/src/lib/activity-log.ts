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
