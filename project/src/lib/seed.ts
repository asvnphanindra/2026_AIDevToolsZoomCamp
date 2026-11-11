import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";
import {
  fictionalSeed,
  type FictionalSeed,
  type SeedArea,
} from "@/data/fictional-seed";
import { db } from "@/lib/firebase";

export type PlannerView = {
  displayName: string;
  areas: SeedArea[];
  taskCount: number;
  source: "firestore" | "local-seed";
};

const DEMO_SUBCOLLECTIONS = [
  "areas",
  "tasks",
  "bands",
  "schedule",
  "dayTypes",
  "scheduleChanges",
  "routines",
  "repeatingTasks",
  "blocks",
  "rules",
  "focusItems",
  "goals",
  "weekHorizon",
  "areaGoals",
  "events",
  "series",
] as const;

/** Ensure owner profile exists under users/{uid} (no demo seed). */
export async function ensureOwnerProfile(
  uid: string,
  displayName: string,
): Promise<PlannerView> {
  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const batch = writeBatch(db);
      batch.set(ref, {
        displayName,
        timezone: "Asia/Kolkata",
        settings: fictionalSeed.profile.settings,
        mode: "owner",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
    }

    const areas = await readAreas(uid);
    return {
      displayName: displayName || "Signed-in user",
      areas,
      taskCount: 0,
      source: "firestore",
    };
  } catch {
    // Auth-only verify when Firestore emulator/JDK is unavailable.
    return {
      displayName: displayName || "Signed-in user",
      areas: [],
      taskCount: 0,
      source: "local-seed",
    };
  }
}

/**
 * US-A2: copy fictional seed into users/{uid}/… for anonymous demo.
 * Re-seeds when profile is missing or areas are empty (covers Auth-up /
 * Firestore-down first click, then Firestore later).
 * Falls back to in-memory seed if Firestore emulator is down.
 */
export async function loadDemoSeed(uid: string): Promise<PlannerView> {
  try {
    const profileRef = doc(db, "users", uid);
    const profileSnap = await getDoc(profileRef);
    const areasExisting = profileSnap.exists() ? await readAreas(uid) : [];
    const needsSeed = !profileSnap.exists() || areasExisting.length === 0;

    if (needsSeed) {
      await writeSeedToUser(uid, fictionalSeed);
    }

    const areas = await readAreas(uid);
    return {
      displayName: fictionalSeed.profile.displayName,
      areas: areas.length ? areas : fictionalSeed.areas,
      taskCount: fictionalSeed.tasks.length,
      source: "firestore",
    };
  } catch {
    return {
      displayName: fictionalSeed.profile.displayName,
      areas: fictionalSeed.areas,
      taskCount: fictionalSeed.tasks.length,
      source: "local-seed",
    };
  }
}

function setSubcollection(
  batch: ReturnType<typeof writeBatch>,
  uid: string,
  name: string,
  rows: Array<Record<string, unknown> & { id: string }> | undefined,
  mapDoc?: (row: Record<string, unknown> & { id: string }) => {
    id: string;
    fields: DocumentData;
  },
): void {
  for (const row of rows ?? []) {
    const mapped = mapDoc
      ? mapDoc(row)
      : (() => {
          const { id, ...fields } = row;
          return { id, fields };
        })();
    batch.set(doc(db, "users", uid, name, mapped.id), mapped.fields);
  }
}

async function writeSeedToUser(
  uid: string,
  seed: FictionalSeed,
): Promise<void> {
  const batch = writeBatch(db);
  batch.set(doc(db, "users", uid), {
    ...seed.profile,
    mode: "demo",
    seededFrom: "seed/demo/fictional.json",
    seededCollections: [...DEMO_SUBCOLLECTIONS],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  setSubcollection(batch, uid, "areas", seed.areas);
  setSubcollection(batch, uid, "tasks", seed.tasks);
  setSubcollection(batch, uid, "bands", seed.bands);
  setSubcollection(batch, uid, "schedule", seed.schedule);
  setSubcollection(batch, uid, "scheduleChanges", seed.scheduleChanges ?? []);
  setSubcollection(batch, uid, "routines", seed.routines);
  setSubcollection(batch, uid, "repeatingTasks", seed.repeatingTasks ?? []);
  setSubcollection(batch, uid, "blocks", seed.blocks);
  setSubcollection(batch, uid, "rules", seed.rules);
  setSubcollection(batch, uid, "focusItems", seed.focusItems ?? []);
  setSubcollection(batch, uid, "goals", seed.goals ?? []);
  setSubcollection(batch, uid, "weekHorizon", seed.weekHorizon ?? []);
  setSubcollection(batch, uid, "areaGoals", seed.areaGoals ?? []);
  setSubcollection(batch, uid, "events", seed.events ?? []);
  setSubcollection(batch, uid, "series", seed.series ?? []);

  for (const dayType of seed.dayTypes) {
    const dateKey = `offset-${dayType.dayOffset}`;
    batch.set(doc(db, "users", uid, "dayTypes", dateKey), dayType);
  }

  // Shared fictional template (read-only for reviewers via rules).
  batch.set(doc(db, "demo", "seed"), {
    label: "Fictional Work Planner sample",
    areaCount: seed.areas.length,
    taskCount: seed.tasks.length,
    scheduleCount: seed.schedule.length,
    goalCount: (seed.goals ?? []).length,
    areaGoalCount: (seed.areaGoals ?? []).length,
    focusCount: (seed.focusItems ?? []).length,
    scheduleChangeCount: (seed.scheduleChanges ?? []).length,
    collections: [...DEMO_SUBCOLLECTIONS],
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
}

async function readAreas(uid: string): Promise<SeedArea[]> {
  const snap = await getDocs(collection(db, "users", uid, "areas"));
  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: String(data["name"] ?? d.id),
        colour: String(data["colour"] ?? "#666"),
        order: Number(data["order"] ?? 0),
      };
    })
    .sort((a, b) => a.order - b.order);
}
