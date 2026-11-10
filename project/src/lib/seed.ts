import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch,
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

/** Ensure owner profile exists under users/{uid} (no demo seed). */
export async function ensureOwnerProfile(
  uid: string,
  displayName: string,
): Promise<PlannerView> {
  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        displayName,
        timezone: "Asia/Kolkata",
        settings: fictionalSeed.profile.settings,
        mode: "owner",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
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
 * US-A2: copy fictional seed into users/{uid}/… once per anonymous session.
 * Falls back to in-memory seed if Firestore emulator is down.
 */
export async function loadDemoSeed(uid: string): Promise<PlannerView> {
  try {
    const profileRef = doc(db, "users", uid);
    const profileSnap = await getDoc(profileRef);
    if (!profileSnap.exists()) {
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

async function writeSeedToUser(
  uid: string,
  seed: FictionalSeed,
): Promise<void> {
  const batch = writeBatch(db);
  batch.set(doc(db, "users", uid), {
    ...seed.profile,
    mode: "demo",
    seededFrom: "seed/demo/fictional.json",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  for (const area of seed.areas) {
    const { id, ...fields } = area;
    batch.set(doc(db, "users", uid, "areas", id), fields);
  }
  for (const task of seed.tasks) {
    const { id, ...fields } = task;
    batch.set(doc(db, "users", uid, "tasks", id), fields);
  }
  // Shared fictional template (read-only for reviewers via rules).
  batch.set(doc(db, "demo", "seed"), {
    label: "Fictional Work Planner sample",
    areaCount: seed.areas.length,
    taskCount: seed.tasks.length,
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
