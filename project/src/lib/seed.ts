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

/** Anonymous Try-demo root. Personal Google data stays under `users/{uid}/…`. */
export const DEMO_COLLECTION = "demo" as const;

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

    const areas = await readAreas(["users", uid]);
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
 * US-A2: copy fictional seed into `demo/{uid}/…` for anonymous Try demo.
 * Requires working Firestore (emulator or prod). No offline / localStorage seed.
 */
export async function loadDemoSeed(uid: string): Promise<PlannerView> {
  const root = [DEMO_COLLECTION, uid] as const;
  const profileRef = doc(db, DEMO_COLLECTION, uid);
  const profileSnap = await getDoc(profileRef);
  const areasExisting = profileSnap.exists()
    ? await readAreas(root)
    : [];
  const needsSeed = !profileSnap.exists() || areasExisting.length === 0;

  if (needsSeed) {
    await writeSeedToDemo(uid, fictionalSeed);
  }

  const areas = await readAreas(root);
  if (!areas.length) {
    throw new Error(
      "Demo seed failed: Firestore returned no areas under demo/{uid}.",
    );
  }

  return {
    displayName: fictionalSeed.profile.displayName,
    areas,
    taskCount: fictionalSeed.tasks.length,
    source: "firestore",
  };
}

function setSubcollection(
  batch: ReturnType<typeof writeBatch>,
  root: readonly [string, string],
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
    batch.set(doc(db, root[0], root[1], name, mapped.id), mapped.fields);
  }
}

async function writeSeedToDemo(
  uid: string,
  seed: FictionalSeed,
): Promise<void> {
  const root = [DEMO_COLLECTION, uid] as const;
  const batch = writeBatch(db);
  batch.set(doc(db, DEMO_COLLECTION, uid), {
    ...seed.profile,
    mode: "demo",
    seededFrom: "seed/demo/fictional.json",
    seededCollections: [...DEMO_SUBCOLLECTIONS],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  setSubcollection(batch, root, "areas", seed.areas);
  setSubcollection(batch, root, "tasks", seed.tasks);
  setSubcollection(batch, root, "bands", seed.bands);
  setSubcollection(batch, root, "schedule", seed.schedule);
  setSubcollection(batch, root, "scheduleChanges", seed.scheduleChanges ?? []);
  setSubcollection(batch, root, "routines", seed.routines);
  setSubcollection(batch, root, "repeatingTasks", seed.repeatingTasks ?? []);
  setSubcollection(batch, root, "blocks", seed.blocks);
  setSubcollection(batch, root, "rules", seed.rules);
  setSubcollection(batch, root, "focusItems", seed.focusItems ?? []);
  setSubcollection(batch, root, "goals", seed.goals ?? []);
  setSubcollection(batch, root, "weekHorizon", seed.weekHorizon ?? []);
  setSubcollection(batch, root, "areaGoals", seed.areaGoals ?? []);
  setSubcollection(batch, root, "events", seed.events ?? []);
  setSubcollection(batch, root, "series", seed.series ?? []);

  for (const dayType of seed.dayTypes) {
    const dateKey = `offset-${dayType.dayOffset}`;
    batch.set(doc(db, DEMO_COLLECTION, uid, "dayTypes", dateKey), dayType);
  }

  await batch.commit();
}

async function readAreas(
  root: readonly [string, string],
): Promise<SeedArea[]> {
  const snap = await getDocs(collection(db, root[0], root[1], "areas"));
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
