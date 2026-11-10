import { useCallback, useState } from "react";
import { AreasConfig } from "@/components/AreasConfig";
import { DayGrid } from "@/components/DayGrid";
import { LiveClock } from "@/components/LiveClock";
import { TaskBacklog } from "@/components/TaskBacklog";
import { useAuth } from "@/hooks/useAuth";
import { SecondClockProvider } from "@/hooks/useSecondClock";
import { fictionalSeed, type SeedArea } from "@/data/fictional-seed";
import { loadAreas, writeAreas } from "@/lib/areas";
import {
  readPlacedBlocks,
  writePlacedBlocks,
  type PlacedBlock,
} from "@/lib/blocks";
import { loadRules, writeRules, type DailyRule } from "@/lib/rules";
import { writeBacklog, type BacklogTask } from "@/lib/tasks";

type AppView = "planner" | "areas";

/** Auth shell + planner / areas config. */
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

  const [appView, setAppView] = useState<AppView>("planner");
  const [tasks, setTasks] = useState<BacklogTask[]>([]);
  const [blocks, setBlocks] = useState<PlacedBlock[]>(() =>
    typeof localStorage === "undefined" ? [] : readPlacedBlocks(),
  );
  const [areas, setAreas] = useState<SeedArea[]>(() =>
    typeof localStorage === "undefined"
      ? fictionalSeed.areas
      : loadAreas(view?.areas?.length ? view.areas : fictionalSeed.areas),
  );
  const [rules, setRules] = useState<DailyRule[]>(() =>
    typeof localStorage === "undefined" ? [] : loadRules(),
  );

  const onTasksChange = useCallback((next: BacklogTask[]) => {
    setTasks(next);
    writeBacklog(next);
  }, []);

  const onBlocksChange = useCallback((next: PlacedBlock[]) => {
    setBlocks(next);
    writePlacedBlocks(next);
  }, []);

  const onAreasChange = useCallback((next: SeedArea[]) => {
    setAreas(next);
    writeAreas(next);
  }, []);

  const onRulesChange = useCallback((next: DailyRule[]) => {
    setRules(next);
    writeRules(next);
  }, []);

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
    <SecondClockProvider>
      <main className="shell shell-wide">
        <header className="brand brand-row">
          <div>
            <h1>Work Planner</h1>
            <p className="lede">
              {isDemo ? "Demo mode · " : ""}
              {view?.displayName || user.email || user.uid}
            </p>
          </div>
          <div className="header-actions">
            <nav className="app-nav" aria-label="App views">
              <button
                type="button"
                className={appView === "planner" ? "nav-active" : "secondary"}
                onClick={() => setAppView("planner")}
              >
                Planner
              </button>
              <button
                type="button"
                className={appView === "areas" ? "nav-active" : "secondary"}
                onClick={() => setAppView("areas")}
              >
                Areas
              </button>
            </nav>
            <div className="header-session">
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={signOut}
              >
                Sign out
              </button>
              <LiveClock timeZone="Asia/Kolkata" />
            </div>
          </div>
        </header>

        {appView === "areas" ? (
          <AreasConfig
            areas={areas}
            onAreasChange={onAreasChange}
            rules={rules}
            onRulesChange={onRulesChange}
          />
        ) : (
          <div className="planner-layout">
            <div className="planner-main">
              <DayGrid
                isDemo={isDemo}
                areas={areas}
                rules={rules}
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
        )}

        {error ? <p className="error">{error}</p> : null}
      </main>
    </SecondClockProvider>
  );
}
