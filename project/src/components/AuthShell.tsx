import { useCallback, useState } from "react";
import { DayGrid } from "@/components/DayGrid";
import { FocusPanel } from "@/components/FocusPanel";
import { LiveClock } from "@/components/LiveClock";
import { PlannerAreas } from "@/components/PlannerAreas";
import { TaskBacklog } from "@/components/TaskBacklog";
import { ThreeWeekView } from "@/components/ThreeWeekView";
import { WeeklyGoals } from "@/components/WeeklyGoals";
import { useAuth } from "@/hooks/useAuth";
import { SecondClockProvider } from "@/hooks/useSecondClock";
import { fictionalSeed, type SeedArea } from "@/data/fictional-seed";
import { loadAreas, writeAreas } from "@/lib/areas";
import {
  readPlacedBlocks,
  writePlacedBlocks,
  type PlacedBlock,
} from "@/lib/blocks";
import {
  loadFocusItems,
  writeFocusItems,
  type FocusItem,
} from "@/lib/focus";
import {
  loadAreaGoals,
  writeAreaGoals,
  type AreaGoal,
} from "@/lib/area-goals";
import {
  loadGoals,
  writeGoals,
  type WeeklyGoal,
} from "@/lib/goals";
import { loadRules, writeRules, type DailyRule } from "@/lib/rules";
import { writeBacklog, type BacklogTask } from "@/lib/tasks";
import {
  loadWeekHorizon,
  writeWeekHorizon,
  type WeekHorizonItem,
} from "@/lib/week-horizon";

type AppView = "scheduler" | "planner" | "focus" | "goals" | "weeks";

/** Auth shell + scheduler / planner / focus / weekly goals / 3-week overview. */
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

  const [appView, setAppView] = useState<AppView>("scheduler");
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
  const [focusItems, setFocusItems] = useState<FocusItem[]>(() =>
    typeof localStorage === "undefined" ? [] : loadFocusItems(),
  );
  const [goals, setGoals] = useState<WeeklyGoal[]>(() =>
    typeof localStorage === "undefined" ? [] : loadGoals(),
  );
  const [weekHorizon, setWeekHorizon] = useState<WeekHorizonItem[]>(() =>
    typeof localStorage === "undefined" ? [] : loadWeekHorizon(),
  );
  const [areaGoals, setAreaGoals] = useState<AreaGoal[]>(() =>
    typeof localStorage === "undefined" ? [] : loadAreaGoals(),
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

  const onFocusItemsChange = useCallback((next: FocusItem[]) => {
    setFocusItems(next);
    writeFocusItems(next);
  }, []);

  const onGoalsChange = useCallback((next: WeeklyGoal[]) => {
    setGoals(next);
    writeGoals(next);
  }, []);

  const onWeekHorizonChange = useCallback((next: WeekHorizonItem[]) => {
    setWeekHorizon(next);
    writeWeekHorizon(next);
  }, []);

  const onAreaGoalsChange = useCallback((next: AreaGoal[]) => {
    setAreaGoals(next);
    writeAreaGoals(next);
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

  const plannerNavActive = appView === "planner" || appView === "weeks";

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
                className={
                  appView === "scheduler" ? "nav-active" : "secondary"
                }
                onClick={() => setAppView("scheduler")}
              >
                Scheduler
              </button>
              <button
                type="button"
                className={plannerNavActive ? "nav-active" : "secondary"}
                onClick={() => setAppView("planner")}
              >
                Planner
              </button>
              <button
                type="button"
                className={appView === "focus" ? "nav-active" : "secondary"}
                onClick={() => setAppView("focus")}
              >
                Focus
              </button>
              <button
                type="button"
                className={appView === "goals" ? "nav-active" : "secondary"}
                onClick={() => setAppView("goals")}
              >
                Goals
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

        {appView === "planner" ? (
          <PlannerAreas
            areas={areas}
            onAreasChange={onAreasChange}
            rules={rules}
            onRulesChange={onRulesChange}
            areaGoals={areaGoals}
            onAreaGoalsChange={onAreaGoalsChange}
            onOpenWeekOverview={() => setAppView("weeks")}
          />
        ) : appView === "focus" ? (
          <FocusPanel
            areas={areas}
            items={focusItems}
            onItemsChange={onFocusItemsChange}
          />
        ) : appView === "goals" ? (
          <WeeklyGoals
            areas={areas}
            goals={goals}
            onGoalsChange={onGoalsChange}
          />
        ) : appView === "weeks" ? (
          <ThreeWeekView
            areas={areas}
            items={weekHorizon}
            onItemsChange={onWeekHorizonChange}
            areaGoals={areaGoals}
            onBackToPlanner={() => setAppView("planner")}
          />
        ) : (
          <div className="scheduler-layout">
            <div className="scheduler-main">
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
            <aside className="scheduler-side">
              <TaskBacklog
                isDemo={isDemo}
                areas={areas}
                tasks={tasks}
                onTasksChange={onTasksChange}
                placedBlocks={blocks}
                onPlacedBlocksChange={onBlocksChange}
              />
            </aside>
          </div>
        )}

        {error ? <p className="error">{error}</p> : null}
      </main>
    </SecondClockProvider>
  );
}
