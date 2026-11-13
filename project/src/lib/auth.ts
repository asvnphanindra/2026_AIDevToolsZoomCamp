import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCredential,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import {
  auth,
  googleProvider,
  isAuthEmulatorReachable,
  isFirestoreEmulatorReachable,
  useEmulators,
} from "@/lib/firebase";
import {
  clearLocalSession,
  localOwnerUser,
  readLocalSession,
  type AppUser,
} from "@/lib/session";
import {
  ensureOwnerProfile,
  loadDemoSeed,
  type PlannerView,
} from "@/lib/seed";
import { newTraceId, reportTelemetry } from "@/lib/telemetry";

export type AuthSession = {
  user: AppUser;
  view: PlannerView;
  isDemo: boolean;
};

type AuthListener = (user: AppUser | null) => void;
const localListeners = new Set<AuthListener>();

function toAppUser(user: User): AppUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    isAnonymous: user.isAnonymous,
    backend: "firebase",
  };
}

function emitLocal(user: AppUser | null): void {
  for (const listener of localListeners) listener(user);
}

function isNetworkAuthError(err: unknown): boolean {
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code: string }).code)
      : "";
  const message = err instanceof Error ? err.message : String(err);
  return (
    code.includes("network-request-failed") ||
    code.includes("unavailable") ||
    /network|Failed to fetch|ERR_CONNECTION/i.test(message)
  );
}

/** US-A1 — Google via Auth emulator when up; else local owner session. */
export async function signInWithGoogle(): Promise<AuthSession> {
  const traceId = newTraceId();
  const emulatorUp = await isAuthEmulatorReachable();
  if (useEmulators && emulatorUp) {
    try {
      const credential = GoogleAuthProvider.credential(
        JSON.stringify({
          sub: "emulator-google-owner",
          email: "owner@example.com",
          email_verified: true,
          name: "Planner Owner",
        }),
      );
      const user = (await signInWithCredential(auth, credential)).user;
      clearLocalSession();
      const view = await ensureOwnerProfile(
        user.uid,
        user.displayName || user.email || "Planner Owner",
      );
      void reportTelemetry({
        name: "signInWithGoogle",
        kind: "auth",
        ok: true,
        traceId,
        attributes: { backend: "emulator", source: view.source },
      });
      return { user: toAppUser(user), view, isDemo: false };
    } catch (err) {
      if (!isNetworkAuthError(err)) {
        void reportTelemetry({
          name: "signInWithGoogle",
          kind: "auth",
          ok: false,
          status: "error",
          reason: "auth_failed",
          traceId,
        });
        throw err;
      }
    }
  } else if (!useEmulators) {
    const user = (await signInWithPopup(auth, googleProvider)).user;
    const view = await ensureOwnerProfile(
      user.uid,
      user.displayName || user.email || "Planner Owner",
    );
    void reportTelemetry({
      name: "signInWithGoogle",
      kind: "auth",
      ok: true,
      traceId,
      attributes: { backend: "firebase", source: view.source },
    });
    return { user: toAppUser(user), view, isDemo: false };
  }

  const user = localOwnerUser();
  emitLocal(user);
  const view = await ensureOwnerProfile(user.uid, user.displayName || "Planner Owner");
  void reportTelemetry({
    name: "signInWithGoogle",
    kind: "auth",
    ok: true,
    traceId,
    attributes: { backend: "local", source: view.source },
  });
  return { user, view, isDemo: false };
}

/**
 * US-A2 — anonymous Auth + fictional seed under `demo/{uid}/…` in Firestore.
 * No offline / localStorage demo path. Requires Auth (+ Firestore) reachable.
 */
export async function signInDemo(): Promise<AuthSession> {
  const traceId = newTraceId();

  if (useEmulators) {
    const authUp = await isAuthEmulatorReachable();
    const fsUp = await isFirestoreEmulatorReachable();
    if (!authUp || !fsUp) {
      void reportTelemetry({
        name: "signInDemo",
        kind: "demo_seed",
        ok: false,
        status: "error",
        reason: "emulators_required",
        traceId,
      });
      throw new Error(
        "Try demo needs Auth + Firestore emulators. Run npm start (JDK 21+), then try again.",
      );
    }
  }

  try {
    const user = (await signInAnonymously(auth)).user;
    clearLocalSession();
    const view = await loadDemoSeed(user.uid);
    void reportTelemetry({
      name: "signInDemo",
      kind: "demo_seed",
      ok: true,
      status: "ok",
      reason: "seeded",
      traceId,
      attributes: {
        source: view.source,
        taskCount: view.taskCount,
        path: `demo/${user.uid}`,
        backend: useEmulators ? "emulator" : "firebase",
      },
    });
    return { user: toAppUser(user), view, isDemo: true };
  } catch (err) {
    void reportTelemetry({
      name: "signInDemo",
      kind: "demo_seed",
      ok: false,
      status: "error",
      reason: "demo_auth_or_seed_failed",
      traceId,
    });
    throw err;
  }
}

export async function signOut(): Promise<void> {
  clearLocalSession();
  emitLocal(null);
  try {
    await firebaseSignOut(auth);
  } catch {
    // Ignore when Auth emulator is down.
  }
}

export function subscribeAuth(listener: AuthListener): () => void {
  localListeners.add(listener);
  const unsubFirebase = onAuthStateChanged(auth, (firebaseUser) => {
    if (firebaseUser) {
      clearLocalSession();
      listener(toAppUser(firebaseUser));
      return;
    }
    listener(readLocalSession());
  });
  return () => {
    localListeners.delete(listener);
    unsubFirebase();
  };
}
