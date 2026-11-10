import { useEffect, useState } from "react";
import {
  signInDemo,
  signInWithGoogle,
  signOut,
  subscribeAuth,
  type AuthSession,
} from "@/lib/auth";
import type { AppUser } from "@/lib/session";
import type { PlannerView } from "@/lib/seed";

export function useAuth() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [view, setView] = useState<PlannerView | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(
    () =>
      subscribeAuth((next) => {
        setUser(next);
        if (!next) {
          setView(null);
          setIsDemo(false);
        } else {
          setIsDemo(next.isAnonymous);
        }
        setReady(true);
      }),
    [],
  );

  async function run(action: () => Promise<AuthSession | void>) {
    setBusy(true);
    setError(null);
    try {
      const session = await action();
      if (session) {
        setUser(session.user);
        setView(session.view);
        setIsDemo(session.isDemo);
      }
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
    view,
    ready,
    error,
    busy,
    isDemo,
    signInWithGoogle: () => run(signInWithGoogle),
    signInDemo: () => run(signInDemo),
    signOut: () => run(signOut),
  };
}
