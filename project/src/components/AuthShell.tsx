import { useCallback, useState } from "react";
import { DayGrid } from "@/components/DayGrid";
import { TaskBacklog } from "@/components/TaskBacklog";
import { useAuth } from "@/hooks/useAuth";
import { fictionalSeed } from "@/data/fictional-seed";
import {
  readPlacedBlocks,
  writePlacedBlocks,
  type PlacedBlock,
} from "@/lib/blocks";
import { writeBacklog, type BacklogTask } from "@/lib/tasks";

/** Auth shell + backlog + week grid (US-C1/C2). */
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

  const [tasks, setTasks] = useState<BacklogTask[]>([]);
  const [blocks, setBlocks] = useState<PlacedBlock[]>(() =>
    typeof localStorage === "undefined" ? [] : readPlacedBlocks(),
  );

  const onTasksChange = useCallback((next: BacklogTask[]) => {
    setTasks(next);
    writeBacklog(next);
  }, []);

  const onBlocksChange = useCallback((next: PlacedBlock[]) => {
    setBlocks(next);
    writePlacedBlocks(next);
  }, []);

  const areas = view?.areas?.length ? view.areas : fictionalSeed.areas;

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

      <div className="planner-layout">
        <div className="planner-main">
          <DayGrid
            isDemo={isDemo}
            areas={areas}
            timezone="Asia/Kolkata"
            tasks={tasks}
            onTasksChange={onTasksChange}
            placedBlocks={blocks}
            onPlacedBlocksChange={onBlocksChange}
          />
        </div>
        <aside className="planner-side">
          <TaskBacklog
            isDemo={isDemo}
            areas={areas}
            tasks={tasks}
            onTasksChange={onTasksChange}
          />
        </aside>
      </div>

      {error ? <p className="error">{error}</p> : null}
    </main>
  );
}
