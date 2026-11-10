import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import {
  signInDemo,
  signInWithGoogle,
  signOut,
  subscribeAuth,
} from "@/lib/auth";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => subscribeAuth((next) => {
    setUser(next);
    setReady(true);
  }), []);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Authentication failed";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return {
    user,
    ready,
    error,
    busy,
    isDemo: user?.isAnonymous === true,
    signInWithGoogle: () => run(signInWithGoogle),
    signInDemo: () => run(signInDemo),
    signOut: () => run(signOut),
  };
}
