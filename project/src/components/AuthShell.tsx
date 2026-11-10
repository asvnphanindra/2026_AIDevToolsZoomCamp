import { DayGrid } from "@/components/DayGrid";
import { useAuth } from "@/hooks/useAuth";

/** US-A1/A2 auth shell + US-B1 day grid when signed in. */
export function AuthShell() {
  const {
    user,
    view,
    ready,
    error,
    busy,
    isDemo,
    signInWithGoogle,
    signInDemo,
    signOut,
  } = useAuth();

  if (!ready) {
    return (
      <main className="shell">
        <p className="muted">Loading auth…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="shell">
        <header className="brand">
          <h1>Work Planner</h1>
          <p className="lede">
            Sign in to keep your plan private, or try the fictional demo.
          </p>
        </header>
        <div className="actions">
          <button type="button" disabled={busy} onClick={signInWithGoogle}>
            Sign in with Google
          </button>
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={signInDemo}
          >
            Try demo
          </button>
        </div>
        {error ? <p className="error">{error}</p> : null}
        <p className="hint">
          Local (`work-planner-demo`): Auth :9099 · Firestore :8080. Emulator
          Google uses a fake credential; demo loads{" "}
          <code>seed/demo/fictional.json</code>.
        </p>
      </main>
    );
  }

  return (
    <main className="shell shell-wide">
      <header className="brand brand-row">
        <div>
          <h1>Work Planner</h1>
          <p className="lede">
            {isDemo ? "Demo mode · " : ""}
            {view?.displayName || user.email || user.uid}
          </p>
        </div>
        <button
          type="button"
          className="secondary"
          disabled={busy}
          onClick={signOut}
        >
          Sign out
        </button>
      </header>

      <DayGrid
        isDemo={isDemo}
        areas={view?.areas ?? []}
        timezone="Asia/Kolkata"
      />

      {error ? <p className="error">{error}</p> : null}
    </main>
  );
}
