import { useAuth } from "@/hooks/useAuth";

/** US-A1 Google sign-in + US-A2 Try demo (anonymous + fictional seed). */
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
    <main className="shell">
      <header className="brand">
        <h1>Work Planner</h1>
        <p className="lede">
          {isDemo ? "Demo mode · " : ""}
          {view?.displayName || user.email || user.uid}
        </p>
      </header>

      <section className="placeholder">
        <h2>{isDemo ? "Fictional seed loaded" : "Your planner"}</h2>
        <p className="muted">
          Path <code>users/{user.uid}/…</code>
          {view ? ` · source ${view.source}` : null}
        </p>
        {view?.areas?.length ? (
          <ul className="area-list">
            {view.areas.map((area) => (
              <li key={area.id}>
                <span
                  className="swatch"
                  style={{ background: area.colour }}
                  aria-hidden
                />
                {area.name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No life areas yet (owner starts empty).</p>
        )}
        {isDemo ? (
          <p className="muted">{view?.taskCount ?? 0} sample backlog tasks.</p>
        ) : null}
      </section>

      <div className="actions">
        <button
          type="button"
          className="secondary"
          disabled={busy}
          onClick={signOut}
        >
          Sign out
        </button>
      </div>
      {error ? <p className="error">{error}</p> : null}
    </main>
  );
}
