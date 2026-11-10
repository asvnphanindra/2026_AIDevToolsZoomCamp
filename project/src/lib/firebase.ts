import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  GoogleAuthProvider,
  type Auth,
} from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    "work-planner-demo.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "work-planner-demo",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    "work-planner-demo.appspot.com",
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:000000000000:web:demo",
};

export const AUTH_EMULATOR_URL = "http://127.0.0.1:9099";
export const FIRESTORE_EMULATOR_HOST = "127.0.0.1";
export const FIRESTORE_EMULATOR_PORT = 8080;

export const app: FirebaseApp = initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export const useEmulators =
  (import.meta.env.VITE_USE_EMULATORS ?? "true").toLowerCase() !== "false";

let emulatorsConnected = false;

/** Connect Auth (+ Firestore when available) emulators once. */
export function connectFirebaseEmulators(): void {
  if (emulatorsConnected || !useEmulators) return;
  connectAuthEmulator(auth, AUTH_EMULATOR_URL, { disableWarnings: true });
  connectFirestoreEmulator(db, FIRESTORE_EMULATOR_HOST, FIRESTORE_EMULATOR_PORT);
  emulatorsConnected = true;
}

/** True when Auth emulator accepts TCP (no Java required). */
export async function isAuthEmulatorReachable(): Promise<boolean> {
  if (!useEmulators) return false;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 500);
    await fetch(`${AUTH_EMULATOR_URL}/`, { signal: ctrl.signal });
    clearTimeout(timer);
    return true;
  } catch {
    return false;
  }
}
