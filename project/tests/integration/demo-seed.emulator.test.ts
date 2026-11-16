import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { signInAnonymously, signOut } from "firebase/auth";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import {
  auth,
  connectFirebaseEmulators,
  db,
  isAuthEmulatorReachable,
  isFirestoreEmulatorReachable,
} from "@/lib/firebase";
import {
  DEMO_COLLECTION,
  loadDemoSeed,
  seedDemoWithTemplate,
} from "@/lib/seed";
import { fictionalSeed } from "@/data/fictional-seed";
import { applyTemplate } from "@/data/templates";
import { demoRoot } from "@/lib/planner-store";

/**
 * Integration: anonymous Auth + demo template seed against Firebase emulators.
 * Run via `npm test` / `firebase emulators:exec` (not alone).
 */
describe("demo seed via Firebase emulators", () => {
  beforeEach(async () => {
    connectFirebaseEmulators();
    const authUp = await isAuthEmulatorReachable();
    const fsUp = await isFirestoreEmulatorReachable();
    if (!authUp || !fsUp) {
      throw new Error(
        "Auth/Firestore emulators not reachable. Use npm test (emulators:exec).",
      );
    }
    // Fresh anonymous uid per test — avoids stacking student applyTemplate on
    // a prior teacher-phd seed (parallel subcollection replaces + shared
    // Listen stream → RESOURCE_EXHAUSTED in CI).
    try {
      await signOut(auth);
    } catch {
      /* ignore */
    }
  });

  afterAll(async () => {
    try {
      await signOut(auth);
    } catch {
      /* ignore */
    }
  });

  it("awaits template then writes Teacher/PhD seed under demo/{uid}", async () => {
    const cred = await signInAnonymously(auth);
    const uid = cred.user.uid;
    expect(uid).toBeTruthy();

    const pending = await loadDemoSeed(uid);
    expect(pending.source).toBe("firestore");
    expect(pending.areas.length).toBe(0);

    const profile = await getDoc(doc(db, DEMO_COLLECTION, uid));
    expect(profile.exists()).toBe(true);
    expect(profile.data()?.["mode"]).toBe("demo");
    expect(profile.data()?.["awaitingTemplate"]).toBe(true);

    const view = await seedDemoWithTemplate(uid, "teacher-phd");
    expect(view.areas.length).toBe(fictionalSeed.areas.length);
    expect(view.taskCount).toBe(fictionalSeed.tasks.length);

    const areasSnap = await getDocs(
      collection(db, DEMO_COLLECTION, uid, "areas"),
    );
    expect(areasSnap.size).toBe(fictionalSeed.areas.length);

    const tasksSnap = await getDocs(
      collection(db, DEMO_COLLECTION, uid, "tasks"),
    );
    expect(tasksSnap.size).toBe(fictionalSeed.tasks.length);

    // Anonymous must not read personal users/{uid} (rules deny).
    await expect(
      getDocs(collection(db, "users", uid, "areas")),
    ).rejects.toMatchObject({ code: "permission-denied" });

    const names = areasSnap.docs.map((d) => String(d.data()["name"] ?? ""));
    expect(names).toEqual(
      expect.arrayContaining(fictionalSeed.areas.map((a) => a.name)),
    );
  });

  it("applies student template config under demo/{uid}", async () => {
    const cred = await signInAnonymously(auth);
    const uid = cred.user.uid;
    await loadDemoSeed(uid);
    await applyTemplate(demoRoot(uid), "student", { setupDone: true });

    const profile = await getDoc(doc(db, DEMO_COLLECTION, uid));
    expect(profile.data()?.["templateId"]).toBe("student");
    expect(profile.data()?.["awaitingTemplate"]).toBe(false);

    const areasSnap = await getDocs(
      collection(db, DEMO_COLLECTION, uid, "areas"),
    );
    const names = areasSnap.docs.map((d) => String(d.data()["name"] ?? ""));
    expect(names).toEqual(
      expect.arrayContaining(["Study", "Projects", "Health", "Social"]),
    );
  });
});
