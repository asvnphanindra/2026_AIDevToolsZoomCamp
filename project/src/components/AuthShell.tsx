import { useAuth } from "@/hooks/useAuth";

/** Minimal sign-in / demo shell for US-A1 + US-A2 placeholders. */
export function AuthShell() {
  const {
    user,
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
            Plan days with energy, check-ins, and horizons. Scaffold only —
            day grid comes next.
          </p>
        </header>
        <div className="actions">
          <button type="button" disabled={busy} onClick={signInWithGoogle}>
            Sign in with Google (US-A1)
          </button>
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={signInDemo}
          >
            Try demo (US-A2)
          </button>
        </div>
        {error ? <p className="error">{error}</p> : null}
        <p className="hint">
          Local: Auth emulator at :9099. Google popup needs emulator test
          accounts or real project credentials later.
        </p>
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="brand">
        <h1>Work Planner</h1>
        <p className="lede">
          Signed in as {isDemo ? "demo (anonymous)" : user.email || user.uid}
        </p>
      </header>
      <section className="placeholder">
        <h2>Day view (stub)</h2>
        <p className="muted">
          US-B1 3-day grid placeholder. Owner path:{" "}
          <code>users/{user.uid}/…</code>
          {isDemo ? (
            <>
              {" "}
              · demo seed path: <code>demo/…</code>
            </>
          ) : null}
        </p>
      </section>
      <div className="actions">
        <button type="button" className="secondary" disabled={busy} onClick={signOut}>
          Sign out
        </button>
      </div>
      {error ? <p className="error">{error}</p> : null}
    </main>
  );
}
