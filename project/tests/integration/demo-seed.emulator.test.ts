import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { signInAnonymously, signOut } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import {
  auth,
  connectFirebaseEmulators,
  db,
  isAuthEmulatorReachable,
  isFirestoreEmulatorReachable,
} from "@/lib/firebase";
import { loadDemoSeed } from "@/lib/seed";
import { fictionalSeed } from "@/data/fictional-seed";

/**
 * Integration: anonymous Auth + loadDemoSeed against Firebase emulators.
 * Run via `npm test` / `firebase emulators:exec` (not alone).
 */
describe("demo seed via Firebase emulators", () => {
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

  it("writes fictional areas under users/{uid} after Try-demo seed", async () => {
    const cred = await signInAnonymously(auth);
    const uid = cred.user.uid;
    expect(uid).toBeTruthy();

    const view = await loadDemoSeed(uid);
    expect(view.source).toBe("firestore");
    expect(view.areas.length).toBe(fictionalSeed.areas.length);
    expect(view.taskCount).toBe(fictionalSeed.tasks.length);

    const areasSnap = await getDocs(collection(db, "users", uid, "areas"));
    expect(areasSnap.size).toBe(fictionalSeed.areas.length);

    const tasksSnap = await getDocs(collection(db, "users", uid, "tasks"));
    expect(tasksSnap.size).toBe(fictionalSeed.tasks.length);

    const names = areasSnap.docs.map((d) => String(d.data()["name"] ?? ""));
    expect(names).toEqual(
      expect.arrayContaining(fictionalSeed.areas.map((a) => a.name)),
    );
  });
});
