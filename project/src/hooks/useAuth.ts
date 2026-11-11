import { useEffect, useRef, useState } from "react";
import {
  signInDemo,
  signInWithGoogle,
  signOut,
  subscribeAuth,
  type AuthSession,
} from "@/lib/auth";
import type { AppUser } from "@/lib/session";
import { loadDemoSeed, type PlannerView } from "@/lib/seed";

export function useAuth() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [view, setView] = useState<PlannerView | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** Demo seed attempted for this uid (page refresh re-runs; Sign out clears). */
  const seededForUid = useRef<string | null>(null);

  useEffect(
    () =>
      subscribeAuth((next) => {
        setUser(next);
        if (!next) {
          setView(null);
          setIsDemo(false);
          seededForUid.current = null;
        } else {
          setIsDemo(next.isAnonymous);
        }
        setReady(true);
      }),
    [],
  );

  // Restored anonymous Auth session: ensure Firestore demo seed exists.
  useEffect(() => {
    if (!ready || !user?.isAnonymous) return;
    if (seededForUid.current === user.uid) return;
    let cancelled = false;
    seededForUid.current = user.uid;
    void loadDemoSeed(user.uid).then((nextView) => {
      if (cancelled) return;
      setView(nextView);
      setIsDemo(true);
    });
    return () => {
      cancelled = true;
    };
  }, [ready, user]);

  async function run(action: () => Promise<AuthSession | void>) {
    setBusy(true);
    setError(null);
    try {
      const session = await action();
      if (session) {
        setUser(session.user);
        setView(session.view);
        setIsDemo(session.isDemo);
        if (session.isDemo) seededForUid.current = session.user.uid;
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
