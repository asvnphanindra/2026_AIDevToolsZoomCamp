import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCredential,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { auth, googleProvider, useEmulators } from "@/lib/firebase";
import {
  ensureOwnerProfile,
  loadDemoSeed,
  type PlannerView,
} from "@/lib/seed";

export type AuthSession = {
  user: User;
  view: PlannerView;
  isDemo: boolean;
};

/** US-A1 — Google via Firebase Auth (emulator uses fake Google credential). */
export async function signInWithGoogle(): Promise<AuthSession> {
  let user: User;
  if (useEmulators) {
    const credential = GoogleAuthProvider.credential(
      JSON.stringify({
        sub: "emulator-google-owner",
        email: "owner@example.com",
        email_verified: true,
        name: "Planner Owner",
      }),
    );
    user = (await signInWithCredential(auth, credential)).user;
  } else {
    user = (await signInWithPopup(auth, googleProvider)).user;
  }

  const view = await ensureOwnerProfile(
    user.uid,
    user.displayName || user.email || "Planner Owner",
  );
  return { user, view, isDemo: false };
}

/** US-A2 — anonymous auth + fictional seed under users/{uid}. */
export async function signInDemo(): Promise<AuthSession> {
  const user = (await signInAnonymously(auth)).user;
  const view = await loadDemoSeed(user.uid);
  return { user, view, isDemo: true };
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export function subscribeAuth(
  listener: (user: User | null) => void,
): () => void {
  return onAuthStateChanged(auth, listener);
}
