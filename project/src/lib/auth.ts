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
  useEmulators,
} from "@/lib/firebase";
import {
  clearLocalSession,
  localDemoUser,
  localOwnerUser,
  readLocalSession,
  type AppUser,
} from "@/lib/session";
import {
  ensureOwnerProfile,
  loadDemoSeed,
  type PlannerView,
} from "@/lib/seed";

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
      return { user: toAppUser(user), view, isDemo: false };
    } catch (err) {
      if (!isNetworkAuthError(err)) throw err;
    }
  } else if (!useEmulators) {
    const user = (await signInWithPopup(auth, googleProvider)).user;
    const view = await ensureOwnerProfile(
      user.uid,
      user.displayName || user.email || "Planner Owner",
    );
    return { user: toAppUser(user), view, isDemo: false };
  }

  const user = localOwnerUser();
  emitLocal(user);
  const view = await ensureOwnerProfile(user.uid, user.displayName || "Planner Owner");
  return { user, view, isDemo: false };
}

/**
 * US-A2 — anonymous Auth emulator when reachable; otherwise offline local demo
 * so Try demo works with `npm run dev` alone (no Hosting / no Java).
 * When Auth + Firestore emulators are up, fictional seed is written under
 * `users/{uid}/…` (visible in Emulator UI → Firestore). Runtime UI edits still
 * use localStorage until full Firestore persistence lands.
 */
export async function signInDemo(): Promise<AuthSession> {
  const authUp = await isAuthEmulatorReachable();
  if (useEmulators && authUp) {
    try {
      const user = (await signInAnonymously(auth)).user;
      clearLocalSession();
      const view = await loadDemoSeed(user.uid);
      return { user: toAppUser(user), view, isDemo: true };
    } catch (err) {
      if (!isNetworkAuthError(err)) throw err;
    }
  }

  // Offline / Auth-down path: local session + in-memory/localStorage seed.
  // Without Firebase Auth, Firestore rules block writes — Emulator UI stays
  // empty until Auth+Firestore are both up and Try demo runs again.
  const user = localDemoUser();
  emitLocal(user);
  const view = await loadDemoSeed(user.uid);
  return { user, view, isDemo: true };
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
