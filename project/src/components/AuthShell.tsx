import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityLog } from "@/components/ActivityLog";
import { DayGrid } from "@/components/DayGrid";
import { LiveClock } from "@/components/LiveClock";
import { MonthCalendarView } from "@/components/MonthCalendarView";
import { PlannerAreas } from "@/components/PlannerAreas";
import { TaskBacklog } from "@/components/TaskBacklog";
import { ThreeWeekView } from "@/components/ThreeWeekView";
import { useAuth } from "@/hooks/useAuth";
import { SecondClockProvider } from "@/hooks/useSecondClock";
import { fictionalSeed, type SeedArea } from "@/data/fictional-seed";
import {
  appendActivity,
  loadActivityLog,
  type ActivityActor,
  type ActivityEntry,
} from "@/lib/activity-log";
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
  JOB_AREA_ID,
  loadOrSeedTeachingPlan,
  persistTeachingPlan,
  type TeachingPlanState,
} from "@/lib/teaching-plan";
import {
  loadWeekHorizon,
  writeWeekHorizon,
  type WeekHorizonItem,
} from "@/lib/week-horizon";
import {
  actorRoleFromProfile,
  ensureWorkspaceOwner,
  type WorkspaceProfile,
} from "@/lib/workspace";

type AppView = "scheduler" | "planner" | "weeks" | "calendar" | "activity";

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
    signInWithEmail,
    createAccountWithEmail,
    signInDemo,
    signOut,
  } = useAuth();

  const [appView, setAppView] = useState<AppView>("scheduler");
  const [demoReady, setDemoReady] = useState(false);
  const [demoLoadError, setDemoLoadError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
  const [teachingPlan, setTeachingPlan] = useState<TeachingPlanState | null>(
    null,
  );
  const [activityEntries, setActivityEntries] = useState<ActivityEntry[]>([]);
  const [workspace, setWorkspace] = useState<WorkspaceProfile | null>(null);

  const workspaceOwnerUid = workspace?.workspaceOwnerUid || user?.uid || "";

  const activityActor = useMemo((): ActivityActor | null => {
    if (!user) return null;
    if (isDemo) {
      return {
        uid: user.uid,
        label: view?.displayName || "Demo",
        role: "human",
      };
    }
    if (workspace) {
      return {
        uid: user.uid,
        label:
          workspace.displayName ||
          user.displayName ||
          user.email ||
          user.uid,
        role: actorRoleFromProfile(workspace),
      };
    }
    return {
      uid: user.uid,
      label: user.displayName || user.email || user.uid,
      role: "owner",
    };
  }, [user, isDemo, view?.displayName, workspace]);

  const logActivity = useCallback(
    async (input: {
      action: string;
      entityType: string;
      entityId: string;
      summary: string;
    }) => {
      if (!activityActor || !workspaceOwnerUid) return;
      try {
        const entry = await appendActivity({
          ownerUid: workspaceOwnerUid,
          isDemo,
          actor: activityActor,
          ...input,
        });
        setActivityEntries((prev) => [entry, ...prev].slice(0, 100));
      } catch {
        // Non-blocking for planner UX.
      }
    },
    [activityActor, workspaceOwnerUid, isDemo],
  );

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

    let cancelled = false;
    void (async () => {
      try {
        const profile = await ensureWorkspaceOwner(
          user.uid,
          user.displayName || user.email || "Planner Owner",
        );
        if (cancelled) return;
        setWorkspace(profile);
        const ownerUid = profile.workspaceOwnerUid || user.uid;
        const [plan, activity] = await Promise.all([
          loadOrSeedTeachingPlan({
            ownerUid,
            isDemo: false,
            areaId: JOB_AREA_ID,
          }),
          loadActivityLog({ ownerUid, isDemo: false }),
        ]);
        if (cancelled) return;
        setTeachingPlan(plan);
        setActivityEntries(activity);
      } catch {
        if (cancelled) return;
        const plan = await loadOrSeedTeachingPlan({
          ownerUid: user.uid,
          isDemo: false,
          areaId: JOB_AREA_ID,
        });
        setTeachingPlan(plan);
      }
    })();
    return () => {
      cancelled = true;
    };
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
        setWorkspace({
          uid: user.uid,
          displayName: fictionalSeed.profile.displayName,
          role: "human",
          workspaceOwnerUid: user.uid,
        });
        try {
          const [plan, activity] = await Promise.all([
            loadOrSeedTeachingPlan({
              ownerUid: user.uid,
              isDemo: true,
              areaId: JOB_AREA_ID,
            }),
            loadActivityLog({ ownerUid: user.uid, isDemo: true }),
          ]);
          if (cancelled || demoUidRef.current !== user.uid) return;
          setTeachingPlan(plan);
          setActivityEntries(activity);
        } catch {
          if (cancelled) return;
          setTeachingPlan(
            await loadOrSeedTeachingPlan({
              ownerUid: user.uid,
              isDemo: true,
              areaId: JOB_AREA_ID,
            }),
          );
        }
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
      } else {
        writeBacklog(next);
      }
      void logActivity({
        action: "update",
        entityType: "tasks",
        entityId: "backlog",
        summary: `Updated backlog (${next.length} tasks)`,
      });
    },
    [isDemo, persistDemo, logActivity],
  );

  const onBlocksChange = useCallback(
    (next: PlacedBlock[]) => {
      setBlocks(next);
      if (isDemo) {
        void persistDemo("blocks", next);
      } else {
        writePlacedBlocks(next);
      }
      void logActivity({
        action: "update",
        entityType: "blocks",
        entityId: "placed",
        summary: `Updated placed blocks (${next.length})`,
      });
    },
    [isDemo, persistDemo, logActivity],
  );

  const onAreasChange = useCallback(
    (next: SeedArea[]) => {
      setAreas(next);
      if (isDemo) {
        void persistDemo("areas", next);
      } else {
        writeAreas(next);
      }
      void logActivity({
        action: "update",
        entityType: "areas",
        entityId: "list",
        summary: `Updated areas (${next.length})`,
      });
    },
    [isDemo, persistDemo, logActivity],
  );

  const onRulesChange = useCallback(
    (next: DailyRule[]) => {
      setRules(next);
      if (isDemo) {
        void persistDemo("rules", next);
      } else {
        writeRules(next);
      }
      void logActivity({
        action: "update",
        entityType: "rules",
        entityId: "daily",
        summary: `Updated daily minimums (${next.length})`,
      });
    },
    [isDemo, persistDemo, logActivity],
  );

  const onFocusItemsChange = useCallback(
    (next: FocusItem[]) => {
      setFocusItems(next);
      if (isDemo) {
        void persistDemo("focusItems", next);
      } else {
        writeFocusItems(next);
      }
      void logActivity({
        action: "update",
        entityType: "focusItems",
        entityId: "list",
        summary: `Updated standing focus (${next.length})`,
      });
    },
    [isDemo, persistDemo, logActivity],
  );

  const onWeekHorizonChange = useCallback(
    (next: WeekHorizonItem[]) => {
      setWeekHorizon(next);
      if (isDemo) {
        void persistDemo("weekHorizon", next);
      } else {
        writeWeekHorizon(next);
      }
      void logActivity({
        action: "update",
        entityType: "weekHorizon",
        entityId: "list",
        summary: `Updated week horizon (${next.length})`,
      });
    },
    [isDemo, persistDemo, logActivity],
  );

  const onAreaGoalsChange = useCallback(
    (next: AreaGoal[]) => {
      setAreaGoals(next);
      if (isDemo) {
        void persistDemo("areaGoals", next);
      } else {
        writeAreaGoals(next);
      }
      void logActivity({
        action: "update",
        entityType: "areaGoals",
        entityId: "list",
        summary: `Updated area goals (${next.length})`,
      });
    },
    [isDemo, persistDemo, logActivity],
  );

  const onTeachingPlanChange = useCallback(
    (next: TeachingPlanState) => {
      setTeachingPlan(next);
      if (!workspaceOwnerUid) return;
      void (async () => {
        await persistTeachingPlan({
          ownerUid: workspaceOwnerUid,
          isDemo,
          state: next,
        });
        await logActivity({
          action: "update",
          entityType: "teachingPlan",
          entityId: next.id,
          summary: `Updated teaching plan (${next.topics.length} topics)`,
        });
      })();
    },
    [workspaceOwnerUid, isDemo, logActivity],
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
        void persistDemo(
          "series",
          next as Array<Record<string, unknown> & { id: string }>,
        );
      } else {
        writeCalendarSeries(next);
      }
      void logActivity({
        action: "update",
        entityType: "series",
        entityId: "calendar",
        summary: `Updated calendar series (${next.length})`,
      });
    },
    [isDemo, persistDemo, logActivity],
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
            Sign in with email to keep your plan private, or try the fictional
            demo.
          </p>
        </header>
        <form
          className="auth-form"
          onSubmit={(event) => {
            event.preventDefault();
            void signInWithEmail(email, password);
          }}
        >
          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              disabled={busy}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              disabled={busy}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
            />
          </label>
          <div className="actions">
            <button type="submit" disabled={busy}>
              Sign in
            </button>
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={() => void createAccountWithEmail(email, password)}
            >
              Create account
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
        </form>
        {error ? <p className="error">{error}</p> : null}
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
              <button
                type="button"
                className={
                  appView === "activity" ? "nav-active" : "secondary"
                }
                onClick={() => setAppView("activity")}
              >
                Activity
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
            teachingPlan={teachingPlan}
            onTeachingPlanChange={onTeachingPlanChange}
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
        ) : appView === "activity" ? (
          <ActivityLog entries={activityEntries} />
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
