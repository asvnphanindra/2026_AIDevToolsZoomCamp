import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import {
  auth,
  isAuthEmulatorReachable,
  isFirestoreEmulatorReachable,
  useEmulators,
} from "@/lib/firebase";
import {
  clearLocalSession,
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

/** Map Firebase Auth codes to short, actionable UI messages. */
export function authErrorMessage(err: unknown): string {
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code: string }).code)
      : "";
  switch (code) {
    case "auth/email-already-in-use":
      return "That email already has an account. Sign in instead.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/missing-email":
      return "Email is required.";
    case "auth/missing-password":
      return "Password is required.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
      return "Wrong email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a moment and try again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/operation-not-allowed":
      return "Email/password sign-in is not enabled for this project.";
    default: {
      if (err instanceof Error && err.message) return err.message;
      return "Authentication failed";
    }
  }
}

async function requireAuthBackend(action: string): Promise<void> {
  if (!useEmulators) return;
  const up = await isAuthEmulatorReachable();
  if (!up) {
    throw new Error(
      `${action} needs the Auth emulator. Run npm start, then try again.`,
    );
  }
}

async function completeOwnerSignIn(
  user: User,
  telemetryName: string,
  traceId: string,
): Promise<AuthSession> {
  clearLocalSession();
  const view = await ensureOwnerProfile(
    user.uid,
    user.displayName || user.email || "Planner Owner",
  );
  void reportTelemetry({
    name: telemetryName,
    kind: "auth",
    ok: true,
    traceId,
    attributes: {
      backend: useEmulators ? "emulator" : "firebase",
      source: view.source,
      provider: "password",
    },
  });
  return { user: toAppUser(user), view, isDemo: false };
}

/** US-A1 — email/password sign-in (non-anonymous → users/{uid}). */
export async function signInWithEmail(
  email: string,
  password: string,
): Promise<AuthSession> {
  const traceId = newTraceId();
  const trimmed = email.trim();
  if (!trimmed) throw new Error("Email is required.");
  if (!password) throw new Error("Password is required.");

  try {
    await requireAuthBackend("Sign in");
    const user = (
      await signInWithEmailAndPassword(auth, trimmed, password)
    ).user;
    return completeOwnerSignIn(user, "signInWithEmail", traceId);
  } catch (err) {
    void reportTelemetry({
      name: "signInWithEmail",
      kind: "auth",
      ok: false,
      status: "error",
      reason: "auth_failed",
      traceId,
    });
    throw new Error(authErrorMessage(err));
  }
}

/** US-A1 — create email/password account (non-anonymous → users/{uid}). */
export async function createAccountWithEmail(
  email: string,
  password: string,
): Promise<AuthSession> {
  const traceId = newTraceId();
  const trimmed = email.trim();
  if (!trimmed) throw new Error("Email is required.");
  if (!password) throw new Error("Password is required.");
  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  try {
    await requireAuthBackend("Create account");
    const user = (
      await createUserWithEmailAndPassword(auth, trimmed, password)
    ).user;
    return completeOwnerSignIn(user, "createAccountWithEmail", traceId);
  } catch (err) {
    void reportTelemetry({
      name: "createAccountWithEmail",
      kind: "auth",
      ok: false,
      status: "error",
      reason: "auth_failed",
      traceId,
    });
    throw new Error(authErrorMessage(err));
  }
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
    listener(null);
  });
  return () => {
    localListeners.delete(listener);
    unsubFirebase();
  };
}
