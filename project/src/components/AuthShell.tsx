import { useCallback, useEffect, useMemo, useState } from "react";
import { DayGrid } from "@/components/DayGrid";
import { LiveClock } from "@/components/LiveClock";
import { MonthCalendarView } from "@/components/MonthCalendarView";
import { PlannerAreas } from "@/components/PlannerAreas";
import { TaskBacklog } from "@/components/TaskBacklog";
import { ThreeWeekView } from "@/components/ThreeWeekView";
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
  loadCalendarEvents,
  mergeCalendarEvents,
  type CalendarEvent,
} from "@/lib/calendar-events";
import {
  expandAllSeries,
  loadCalendarSeries,
  writeCalendarSeries,
  type CalendarSeries,
} from "@/lib/calendar-series";
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
import { isoWeekPeriod } from "@/lib/goals";
import { loadRules, writeRules, type DailyRule } from "@/lib/rules";
import {
  loadSchedulerLayerMode,
  showsTasksToFocus,
  writeSchedulerLayerMode,
  type SchedulerLayerMode,
} from "@/lib/scheduler-layers";
import {
  backlogTaskFromAreaGoal,
  loadBacklog,
  openBacklogForGoalWeek,
  writeBacklog,
  type BacklogTask,
} from "@/lib/tasks";
import {
  loadWeekHorizon,
  writeWeekHorizon,
  type WeekHorizonItem,
} from "@/lib/week-horizon";

type AppView = "scheduler" | "planner" | "weeks" | "calendar";

/** Auth shell + scheduler / planner / 3-week / calendar. */
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
  const [weekHorizon, setWeekHorizon] = useState<WeekHorizonItem[]>(() =>
    typeof localStorage === "undefined" ? [] : loadWeekHorizon(),
  );
  const [oneOffEvents] = useState<CalendarEvent[]>(() =>
    typeof localStorage === "undefined" ? [] : loadCalendarEvents(),
  );
  const [calendarSeries, setCalendarSeries] = useState<CalendarSeries[]>(() =>
    typeof localStorage === "undefined" ? [] : loadCalendarSeries(),
  );
  const [areaGoals, setAreaGoals] = useState<AreaGoal[]>(() =>
    typeof localStorage === "undefined" ? [] : loadAreaGoals(),
  );
  const [layerMode, setLayerMode] = useState<SchedulerLayerMode>(() =>
    typeof localStorage === "undefined"
      ? "combined"
      : loadSchedulerLayerMode(),
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

  const onWeekHorizonChange = useCallback((next: WeekHorizonItem[]) => {
    setWeekHorizon(next);
    writeWeekHorizon(next);
  }, []);

  const onAreaGoalsChange = useCallback((next: AreaGoal[]) => {
    setAreaGoals(next);
    writeAreaGoals(next);
  }, []);

  const onLayerModeChange = useCallback((mode: SchedulerLayerMode) => {
    setLayerMode(mode);
    if (typeof localStorage !== "undefined") writeSchedulerLayerMode(mode);
  }, []);

  const onCalendarSeriesChange = useCallback((next: CalendarSeries[]) => {
    setCalendarSeries(next);
    writeCalendarSeries(next);
  }, []);

  const plannerTz = "Asia/Kolkata";
  const thisWeekPeriod = useMemo(
    () => isoWeekPeriod(new Date(), plannerTz),
    [],
  );

  const calendarEvents = useMemo(
    () =>
      mergeCalendarEvents(
        oneOffEvents,
        expandAllSeries(calendarSeries, new Date(), plannerTz),
      ),
    [calendarSeries, oneOffEvents],
  );

  const weekBacklogGoalIds = useMemo(() => {
    const ids = new Set<string>();
    for (const t of tasks) {
      if (
        t.status === "backlog" &&
        t.goalId &&
        t.period === thisWeekPeriod
      ) {
        ids.add(t.goalId);
      }
    }
    return ids;
  }, [tasks, thisWeekPeriod]);

  const onAddGoalToWeekBacklog = useCallback(
    (goal: AreaGoal) => {
      const base = tasks.length > 0 ? tasks : loadBacklog(isDemo);
      const existing = openBacklogForGoalWeek(
        base,
        goal.id,
        thisWeekPeriod,
      );
      if (existing) {
        if (base !== tasks) onTasksChange(base);
        return;
      }
      const card = backlogTaskFromAreaGoal(goal, {
        timezone: plannerTz,
      });
      const id = base.some((t) => t.id === card.id)
        ? `task-goal-${Date.now().toString(36)}`
        : card.id;
      onTasksChange([{ ...card, id }, ...base]);
    },
    [tasks, isDemo, onTasksChange, thisWeekPeriod],
  );

  const openSchedulerFocus = useCallback(() => {
    onLayerModeChange("focus");
    setAppView("scheduler");
  }, [onLayerModeChange]);

  useEffect(() => {
    if (!ready || !user || tasks.length > 0) return;
    const loaded = loadBacklog(isDemo);
    if (loaded.length) onTasksChange(loaded);
  }, [ready, user, isDemo, tasks.length, onTasksChange]);

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
          Local (<code>work-planner-demo</code>): <code>npm start</code> runs
          Auth + Firestore + Emulator UI + Vite (JDK 21+).{" "}
          <strong>Try demo</strong> signs in anonymously and writes fictional
          seed under <code>{"users/{uid}/…"}</code> when emulators are up —
          browse{" "}
          <a href="http://127.0.0.1:4000/firestore">:4000 → Firestore</a>.
          Without emulators, Try demo still works offline (local session +
          localStorage; Emulator UI stays empty).
        </p>
      </main>
    );
  }

  const plannerNavActive = appView === "planner" || appView === "weeks";
  const showFocusSide = showsTasksToFocus(layerMode);

  return (
    <SecondClockProvider>
      <main className="shell shell-wide">
        <header className="brand brand-row">
          <div>
            <h1>Work Planner</h1>
            <p className="lede">
              {isDemo ? "Demo mode · " : ""}
              {view?.displayName || user.email || user.uid}
              {isDemo && view?.source
                ? view.source === "firestore"
                  ? " · seed in Firestore emulator"
                  : " · offline local seed (Firestore not written)"
                : ""}
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
                className={
                  appView === "calendar" ? "nav-active" : "secondary"
                }
                onClick={() => setAppView("calendar")}
              >
                Calendar
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
            onAddGoalToWeekBacklog={onAddGoalToWeekBacklog}
            weekBacklogGoalIds={weekBacklogGoalIds}
            weekPeriod={thisWeekPeriod}
            tasks={tasks}
            onTasksChange={onTasksChange}
            focusItems={focusItems}
            onFocusItemsChange={onFocusItemsChange}
            onOpenSchedulerFocus={openSchedulerFocus}
          />
        ) : appView === "weeks" ? (
          <ThreeWeekView
            areas={areas}
            items={weekHorizon}
            onItemsChange={onWeekHorizonChange}
            areaGoals={areaGoals}
            onBackToPlanner={() => setAppView("planner")}
          />
        ) : appView === "calendar" ? (
          <MonthCalendarView
            events={calendarEvents}
            series={calendarSeries}
            onSeriesChange={onCalendarSeriesChange}
          />
        ) : (
          <div
            className={
              showFocusSide
                ? "scheduler-layout"
                : "scheduler-layout scheduler-layout-combined"
            }
          >
            <div className="scheduler-main">
              <DayGrid
                isDemo={isDemo}
                areas={areas}
                timezone="Asia/Kolkata"
                tasks={tasks}
                onTasksChange={onTasksChange}
                placedBlocks={blocks}
                onPlacedBlocksChange={onBlocksChange}
                layerMode={layerMode}
                onLayerModeChange={onLayerModeChange}
              />
            </div>
            {showFocusSide ? (
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
            ) : null}
          </div>
        )}

        {error ? <p className="error">{error}</p> : null}
      </main>
    </SecondClockProvider>
  );
}
