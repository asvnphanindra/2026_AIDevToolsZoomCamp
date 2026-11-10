import { DayGrid } from "@/components/DayGrid";
import { TaskBacklog } from "@/components/TaskBacklog";
import { useAuth } from "@/hooks/useAuth";
import { fictionalSeed } from "@/data/fictional-seed";

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
          Local (`work-planner-demo`): <code>npm start</code> runs Auth
          emulator (:9099) + Vite. <strong>Try demo</strong> also works
          offline if the emulator is down (local session + fictional seed).
          Firestore (:8080) needs JDK 21+ via <code>npm run start:full</code>.
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

      <TaskBacklog
        isDemo={isDemo}
        areas={view?.areas?.length ? view.areas : fictionalSeed.areas}
      />

      <DayGrid
        isDemo={isDemo}
        areas={view?.areas?.length ? view.areas : fictionalSeed.areas}
        timezone="Asia/Kolkata"
      />

      {error ? <p className="error">{error}</p> : null}
    </main>
  );
}
