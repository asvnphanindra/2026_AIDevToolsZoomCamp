import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { signInAnonymously, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
  auth,
  connectFirebaseEmulators,
  db,
  isAuthEmulatorReachable,
  isFirestoreEmulatorReachable,
} from "@/lib/firebase";
import {
  loadDemoPlannerState,
  replaceDemoCollection,
} from "@/lib/demo-store";
import { DEMO_COLLECTION, loadDemoSeed } from "@/lib/seed";

describe("demo runtime Firestore store", () => {
  beforeAll(async () => {
    connectFirebaseEmulators();
    const authUp = await isAuthEmulatorReachable();
    const fsUp = await isFirestoreEmulatorReachable();
    if (!authUp || !fsUp) {
      throw new Error(
        "Auth/Firestore emulators not reachable. Use npm test (emulators:exec).",
      );
    }
  });

  afterAll(async () => {
    try {
      await signOut(auth);
    } catch {
      /* ignore */
    }
  });

  it("reads seed then persists task mutations under demo/{uid}", async () => {
    const cred = await signInAnonymously(auth);
    const uid = cred.user.uid;

    await loadDemoSeed(uid);
    const before = await loadDemoPlannerState(uid);
    expect(before.tasks.length).toBeGreaterThan(0);
    expect(before.areas.length).toBeGreaterThan(0);

    const mutated = [
      {
        id: "task-runtime-mut",
        title: "Firestore runtime write",
        areaId: before.areas[0]!.id,
        durationMin: 45,
        priority: "high",
        status: "backlog",
        horizon: "day",
      },
      ...before.tasks,
    ];
    await replaceDemoCollection(uid, "tasks", mutated);

    const after = await loadDemoPlannerState(uid);
    expect(after.tasks.some((t) => t.id === "task-runtime-mut")).toBe(true);
    expect(
      after.tasks.find((t) => t.id === "task-runtime-mut")?.title,
    ).toBe("Firestore runtime write");

    const snap = await getDoc(
      doc(db, DEMO_COLLECTION, uid, "tasks", "task-runtime-mut"),
    );
    expect(snap.exists()).toBe(true);
    expect(snap.data()?.["title"]).toBe("Firestore runtime write");
  });
});
