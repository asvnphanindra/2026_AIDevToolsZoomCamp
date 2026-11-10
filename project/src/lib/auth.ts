import {
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";

/** US-A1 stub — Google sign-in (works against Auth emulator with test users). */
export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

/** US-A2 stub — anonymous demo session (seed load comes later). */
export async function signInDemo(): Promise<User> {
  const result = await signInAnonymously(auth);
  return result.user;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export function subscribeAuth(
  listener: (user: User | null) => void,
): () => void {
  return onAuthStateChanged(auth, listener);
}
