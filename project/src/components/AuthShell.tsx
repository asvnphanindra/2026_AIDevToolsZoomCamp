import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import type { BlockCheckIn } from "@/lib/checkin";
import {
  loadDemoPlannerState,
  replaceDemoCheckIns,
  replaceDemoCollection,
} from "@/lib/demo-store";
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

function emptyDemoBootstrap() {
  return {
    tasks: [] as BacklogTask[],
    blocks: [] as PlacedBlock[],
    areas: [] as SeedArea[],
    rules: [] as DailyRule[],
    focusItems: [] as FocusItem[],
    weekHorizon: [] as WeekHorizonItem[],
    oneOffEvents: [] as CalendarEvent[],
    calendarSeries: [] as CalendarSeries[],
    areaGoals: [] as AreaGoal[],
    checkIns: {} as Record<string, BlockCheckIn>,
  };
}

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
  const [demoReady, setDemoReady] = useState(false);
  const [demoLoadError, setDemoLoadError] = useState<string | null>(null);
  const demoUidRef = useRef<string | null>(null);

  const [tasks, setTasks] = useState<BacklogTask[]>([]);
  const [blocks, setBlocks] = useState<PlacedBlock[]>([]);
  const [areas, setAreas] = useState<SeedArea[]>([]);
  const [rules, setRules] = useState<DailyRule[]>([]);
  const [focusItems, setFocusItems] = useState<FocusItem[]>([]);
  const [weekHorizon, setWeekHorizon] = useState<WeekHorizonItem[]>([]);
  const [oneOffEvents, setOneOffEvents] = useState<CalendarEvent[]>([]);
  const [calendarSeries, setCalendarSeries] = useState<CalendarSeries[]>([]);
  const [areaGoals, setAreaGoals] = useState<AreaGoal[]>([]);
  const [checkIns, setCheckIns] = useState<Record<string, BlockCheckIn>>({});
  const [layerMode, setLayerMode] = useState<SchedulerLayerMode>("combined");

  // Personal (non-demo): hydrate from localStorage once signed in.
  useEffect(() => {
    if (!ready || !user || isDemo) return;
    setTasks(loadBacklog());
    setBlocks(readPlacedBlocks());
    setAreas(
      loadAreas(view?.areas?.length ? view.areas : fictionalSeed.areas),
    );
    setRules(loadRules());
    setFocusItems(loadFocusItems());
    setWeekHorizon(loadWeekHorizon());
    setOneOffEvents(loadCalendarEvents());
    setCalendarSeries(loadCalendarSeries());
    setAreaGoals(loadAreaGoals());
    setLayerMode(loadSchedulerLayerMode());
    setDemoReady(true);
    setDemoLoadError(null);
  }, [ready, user, isDemo, view?.areas]);

  // Demo: load everything from demo/{uid}/… (no localStorage).
  useEffect(() => {
    if (!ready || !user || !isDemo) return;
    let cancelled = false;
    demoUidRef.current = user.uid;
    setDemoReady(false);
    setDemoLoadError(null);
    const boot = emptyDemoBootstrap();
    setTasks(boot.tasks);
    setBlocks(boot.blocks);
    setAreas(boot.areas);
    setRules(boot.rules);
    setFocusItems(boot.focusItems);
    setWeekHorizon(boot.weekHorizon);
    setOneOffEvents(boot.oneOffEvents);
    setCalendarSeries(boot.calendarSeries);
    setAreaGoals(boot.areaGoals);
    setCheckIns(boot.checkIns);

    void (async () => {
      try {
        const state = await loadDemoPlannerState(user.uid);
        if (cancelled || demoUidRef.current !== user.uid) return;
        setAreas(state.areas);
        setTasks(state.tasks);
        setBlocks(state.blocks);
        setRules(state.rules);
        setFocusItems(state.focusItems);
        setWeekHorizon(state.weekHorizon);
        setOneOffEvents(state.events.filter((e) => !e.seriesId));
        setCalendarSeries(state.series);
        setAreaGoals(state.areaGoals);
        setCheckIns(state.checkIns);
        setDemoReady(true);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Failed to load demo from Firestore";
        setDemoLoadError(message);
        setDemoReady(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, user, isDemo]);

  const persistDemo = useCallback(
    async (name: string, rows: Array<Record<string, unknown> & { id: string }>) => {
      const uid = demoUidRef.current;
      if (!uid) return;
      await replaceDemoCollection(uid, name, rows);
    },
    [],
  );

  const onTasksChange = useCallback(
    (next: BacklogTask[]) => {
      setTasks(next);
      if (isDemo) {
        void persistDemo("tasks", next);
        return;
      }
      writeBacklog(next);
    },
    [isDemo, persistDemo],
  );

  const onBlocksChange = useCallback(
    (next: PlacedBlock[]) => {
      setBlocks(next);
      if (isDemo) {
        void persistDemo("blocks", next);
        return;
      }
      writePlacedBlocks(next);
    },
    [isDemo, persistDemo],
  );

  const onAreasChange = useCallback(
    (next: SeedArea[]) => {
      setAreas(next);
      if (isDemo) {
        void persistDemo("areas", next);
        return;
      }
      writeAreas(next);
    },
    [isDemo, persistDemo],
  );

  const onRulesChange = useCallback(
    (next: DailyRule[]) => {
      setRules(next);
      if (isDemo) {
        void persistDemo("rules", next);
        return;
      }
      writeRules(next);
    },
    [isDemo, persistDemo],
  );

  const onFocusItemsChange = useCallback(
    (next: FocusItem[]) => {
      setFocusItems(next);
      if (isDemo) {
        void persistDemo("focusItems", next);
        return;
      }
      writeFocusItems(next);
    },
    [isDemo, persistDemo],
  );

  const onWeekHorizonChange = useCallback(
    (next: WeekHorizonItem[]) => {
      setWeekHorizon(next);
      if (isDemo) {
        void persistDemo("weekHorizon", next);
        return;
      }
      writeWeekHorizon(next);
    },
    [isDemo, persistDemo],
  );

  const onAreaGoalsChange = useCallback(
    (next: AreaGoal[]) => {
      setAreaGoals(next);
      if (isDemo) {
        void persistDemo("areaGoals", next);
        return;
      }
      writeAreaGoals(next);
    },
    [isDemo, persistDemo],
  );

  const onLayerModeChange = useCallback(
    (mode: SchedulerLayerMode) => {
      setLayerMode(mode);
      // UI chrome only — never localStorage in demo.
      if (!isDemo && typeof localStorage !== "undefined") {
        writeSchedulerLayerMode(mode);
      }
    },
    [isDemo],
  );

  const onCalendarSeriesChange = useCallback(
    (next: CalendarSeries[]) => {
      setCalendarSeries(next);
      if (isDemo) {
        void persistDemo("series", next as Array<Record<string, unknown> & { id: string }>);
        return;
      }
      writeCalendarSeries(next);
    },
    [isDemo, persistDemo],
  );

  const onCheckInsChange = useCallback(
    (next: Record<string, BlockCheckIn>) => {
      setCheckIns(next);
      const uid = demoUidRef.current;
      if (isDemo && uid) void replaceDemoCheckIns(uid, next);
    },
    [isDemo],
  );

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
      const base = tasks;
      const existing = openBacklogForGoalWeek(
        base,
        goal.id,
        thisWeekPeriod,
      );
      if (existing) return;
      const card = backlogTaskFromAreaGoal(goal, {
        timezone: plannerTz,
      });
      const id = base.some((t) => t.id === card.id)
        ? `task-goal-${Date.now().toString(36)}`
        : card.id;
      onTasksChange([{ ...card, id }, ...base]);
    },
    [tasks, onTasksChange, thisWeekPeriod],
  );

  const openSchedulerFocus = useCallback(() => {
    onLayerModeChange("focus");
    setAppView("scheduler");
  }, [onLayerModeChange]);

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
          Local: <code>npm start</code> runs Auth + Firestore + Emulator UI +
          Vite (JDK 21+). <strong>Try demo</strong> signs in anonymously and
          loads/saves all planner data under <code>{"demo/{uid}/…"}</code>{" "}
          (isolated from personal <code>{"users/{uid}/…"}</code>) — browse{" "}
          <a href="http://127.0.0.1:4000/firestore">:4000 → Firestore</a>.
          Auth + Firestore must be up; demo never uses localStorage.
        </p>
      </main>
    );
  }

  if (isDemo && !demoReady) {
    return (
      <main className="shell">
        <p className="muted">
          {demoLoadError
            ? `Demo Firestore error: ${demoLoadError}`
            : "Loading demo from Firestore…"}
        </p>
        {demoLoadError ? (
          <button type="button" className="secondary" onClick={signOut}>
            Sign out
          </button>
        ) : null}
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
              {isDemo ? " · Firestore demo/{uid}" : ""}
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
                {...(isDemo
                  ? {
                      checkIns,
                      onCheckInsChange,
                    }
                  : {})}
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
