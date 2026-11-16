import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityLog } from "@/components/ActivityLog";
import { BottomSheet } from "@/components/BottomSheet";
import { DayAgenda } from "@/components/DayAgenda";
import { DayGrid } from "@/components/DayGrid";
import { LiveClock } from "@/components/LiveClock";
import { MonthCalendarView } from "@/components/MonthCalendarView";
import { PlannerAreas } from "@/components/PlannerAreas";
import { TaskBacklog } from "@/components/TaskBacklog";
import {
  placedBlockFromSchedule,
  TaskEditor,
} from "@/components/TaskEditor";
import { ThreeWeekView } from "@/components/ThreeWeekView";
import { useAuth } from "@/hooks/useAuth";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { SecondClockProvider } from "@/hooks/useSecondClock";
import { dateKeyInTz } from "@/lib/time";
import {
  fictionalSeed,
  type SeedArea,
  type SeedBand,
  type SeedRoutine,
  type SeedSchedule,
} from "@/data/fictional-seed";
import {
  appendActivity,
  loadActivityLog,
  type ActivityActor,
  type ActivityEntry,
} from "@/lib/activity-log";
import { migrateJobAreaName } from "@/lib/areas";
import { type PlacedBlock } from "@/lib/blocks";
import {
  mergeCalendarEvents,
  type CalendarEvent,
} from "@/lib/calendar-events";
import {
  expandAllSeries,
  type CalendarSeries,
} from "@/lib/calendar-series";
import type { BlockCheckIn } from "@/lib/checkin";
import { loadUserConfig, type ConfigDayType } from "@/lib/config";
import {
  loadDemoPlannerState,
  replaceDemoCheckIns,
  replaceDemoCollection,
} from "@/lib/demo-store";
import { type FocusItem } from "@/lib/focus";
import { type AreaGoal } from "@/lib/area-goals";
import { isoWeekPeriod } from "@/lib/goals";
import { migrateLocalToUsers } from "@/lib/migrate-local";
import {
  loadPlannerState,
  replaceCheckIns,
  replaceCollection,
  usersRoot,
} from "@/lib/planner-store";
import { type DailyRule } from "@/lib/rules";
import {
  loadSchedulerLayerMode,
  showsTasksToFocus,
  writeSchedulerLayerMode,
  type SchedulerLayerMode,
} from "@/lib/scheduler-layers";
import {
  backlogTaskFromAreaGoal,
  openBacklogForGoalWeek,
  type BacklogTask,
} from "@/lib/tasks";
import {
  JOB_AREA_ID,
  loadOrSeedTeachingPlan,
  persistTeachingPlan,
  type TeachingPlanState,
} from "@/lib/teaching-plan";
import { type WeekHorizonItem } from "@/lib/week-horizon";
import {
  actorRoleFromProfile,
  ensureWorkspaceOwner,
  type WorkspaceProfile,
} from "@/lib/workspace";

type AppView =
  | "scheduler"
  | "planner"
  | "weeks"
  | "calendar"
  | "activity"
  | "more";

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
  const [fabOpen, setFabOpen] = useState(false);
  const [anchorDate, setAnchorDate] = useState<string | undefined>(undefined);
  const [fabScheduleDate, setFabScheduleDate] = useState<string | undefined>(
    undefined,
  );
  const breakpoint = useBreakpoint();
  const isPhone = breakpoint === "phone";
  const [dataReady, setDataReady] = useState(false);
  const [dataLoadError, setDataLoadError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const plannerUidRef = useRef<string | null>(null);

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
  const [bands, setBands] = useState<SeedBand[]>([]);
  const [routines, setRoutines] = useState<SeedRoutine[]>([]);
  const [schedules, setSchedules] = useState<SeedSchedule[]>([]);
  const [dayTypes, setDayTypes] = useState<ConfigDayType[]>([]);
  const [layerMode, setLayerMode] = useState<SchedulerLayerMode>("combined");
  const [teachingPlan, setTeachingPlan] = useState<TeachingPlanState | null>(
    null,
  );
  const [activityEntries, setActivityEntries] = useState<ActivityEntry[]>([]);
  const [workspace, setWorkspace] = useState<WorkspaceProfile | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);

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

  // Personal: users/{uid}/… via planner-store (+ one-time localStorage migrate).
  useEffect(() => {
    if (!ready || !user || isDemo) return;
    let cancelled = false;
    plannerUidRef.current = user.uid;
    setDataReady(false);
    setDataLoadError(null);
    setNeedsSetup(false);
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
    setBands([]);
    setRoutines([]);
    setSchedules([]);
    setDayTypes([]);
    setLayerMode(loadSchedulerLayerMode());

    void (async () => {
      try {
        const profile = await ensureWorkspaceOwner(
          user.uid,
          user.displayName || user.email || "Planner Owner",
        );
        if (cancelled || plannerUidRef.current !== user.uid) return;
        setWorkspace(profile);
        const ownerUid = profile.workspaceOwnerUid || user.uid;
        await migrateLocalToUsers(ownerUid);
        if (cancelled || plannerUidRef.current !== user.uid) return;

        const root = usersRoot(ownerUid);
        const [state, config, plan, activity] = await Promise.all([
          loadPlannerState(root),
          loadUserConfig(root),
          loadOrSeedTeachingPlan({
            ownerUid,
            isDemo: false,
            areaId: JOB_AREA_ID,
          }),
          loadActivityLog({ ownerUid, isDemo: false }),
        ]);
        if (cancelled || plannerUidRef.current !== user.uid) return;

        const areasMigrated = migrateJobAreaName(state.areas);
        setAreas(areasMigrated);
        if (areasMigrated !== state.areas) {
          void replaceCollection(root, "areas", areasMigrated);
        }
        setTasks(state.tasks);
        setBlocks(state.blocks);
        setRules(state.rules);
        setFocusItems(state.focusItems);
        setWeekHorizon(state.weekHorizon);
        setOneOffEvents(state.events.filter((e) => !e.seriesId));
        setCalendarSeries(state.series);
        setAreaGoals(state.areaGoals);
        setCheckIns(state.checkIns);
        setBands(config.bands);
        setRoutines(config.routines);
        setSchedules(config.schedules);
        setDayTypes(config.dayTypes);
        setTeachingPlan(plan);
        setActivityEntries(activity);
        setNeedsSetup(
          areasMigrated.length === 0 &&
            config.schedules.length === 0 &&
            config.bands.length === 0,
        );
        setDataReady(true);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error
            ? err.message
            : "Failed to load personal plan from Firestore";
        setDataLoadError(message);
        setDataReady(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, user, isDemo]);

  // Demo: load everything from demo/{uid}/… (no localStorage).
  useEffect(() => {
    if (!ready || !user || !isDemo) return;
    let cancelled = false;
    plannerUidRef.current = user.uid;
    setDataReady(false);
    setDataLoadError(null);
    setNeedsSetup(false);
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
    setBands(fictionalSeed.bands);
    setRoutines(fictionalSeed.routines);
    setSchedules(fictionalSeed.schedule);
    setDayTypes([]);

    void (async () => {
      try {
        const state = await loadDemoPlannerState(user.uid);
        if (cancelled || plannerUidRef.current !== user.uid) return;
        const areasMigrated = migrateJobAreaName(state.areas);
        setAreas(areasMigrated);
        if (areasMigrated !== state.areas) {
          void replaceDemoCollection(user.uid, "areas", areasMigrated);
        }
        setTasks(state.tasks);
        setBlocks(state.blocks);
        setRules(state.rules);
        setFocusItems(state.focusItems);
        setWeekHorizon(state.weekHorizon);
        setOneOffEvents(state.events.filter((e) => !e.seriesId));
        setCalendarSeries(state.series);
        setAreaGoals(state.areaGoals);
        setCheckIns(state.checkIns);
        setBands(fictionalSeed.bands);
        setRoutines(fictionalSeed.routines);
        setSchedules(fictionalSeed.schedule);
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
          if (cancelled || plannerUidRef.current !== user.uid) return;
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
        setDataReady(true);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Failed to load demo from Firestore";
        setDataLoadError(message);
        setDataReady(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, user, isDemo]);

  const persistPlanner = useCallback(
    async (name: string, rows: Array<Record<string, unknown> & { id: string }>) => {
      const uid = plannerUidRef.current;
      if (!uid) return;
      if (isDemo) {
        await replaceDemoCollection(uid, name, rows);
        return;
      }
      await replaceCollection(usersRoot(uid), name, rows);
    },
    [isDemo],
  );

  const onTasksChange = useCallback(
    (next: BacklogTask[]) => {
      setTasks(next);
      void persistPlanner("tasks", next);
      void logActivity({
        action: "update",
        entityType: "tasks",
        entityId: "backlog",
        summary: `Updated backlog (${next.length} tasks)`,
      });
    },
    [persistPlanner, logActivity],
  );

  const onBlocksChange = useCallback(
    (next: PlacedBlock[]) => {
      setBlocks(next);
      void persistPlanner("blocks", next);
      void logActivity({
        action: "update",
        entityType: "blocks",
        entityId: "placed",
        summary: `Updated placed blocks (${next.length})`,
      });
    },
    [persistPlanner, logActivity],
  );

  const onAreasChange = useCallback(
    (next: SeedArea[]) => {
      setAreas(next);
      void persistPlanner("areas", next);
      void logActivity({
        action: "update",
        entityType: "areas",
        entityId: "list",
        summary: `Updated areas (${next.length})`,
      });
    },
    [persistPlanner, logActivity],
  );

  const onRulesChange = useCallback(
    (next: DailyRule[]) => {
      setRules(next);
      void persistPlanner("rules", next);
      void logActivity({
        action: "update",
        entityType: "rules",
        entityId: "daily",
        summary: `Updated daily minimums (${next.length})`,
      });
    },
    [persistPlanner, logActivity],
  );

  const onFocusItemsChange = useCallback(
    (next: FocusItem[]) => {
      setFocusItems(next);
      void persistPlanner("focusItems", next);
      void logActivity({
        action: "update",
        entityType: "focusItems",
        entityId: "list",
        summary: `Updated standing focus (${next.length})`,
      });
    },
    [persistPlanner, logActivity],
  );

  const onWeekHorizonChange = useCallback(
    (next: WeekHorizonItem[]) => {
      setWeekHorizon(next);
      void persistPlanner(
        "weekHorizon",
        next as Array<Record<string, unknown> & { id: string }>,
      );
      void logActivity({
        action: "update",
        entityType: "weekHorizon",
        entityId: "list",
        summary: `Updated week horizon (${next.length})`,
      });
    },
    [persistPlanner, logActivity],
  );

  const onAreaGoalsChange = useCallback(
    (next: AreaGoal[]) => {
      setAreaGoals(next);
      void persistPlanner("areaGoals", next);
      void logActivity({
        action: "update",
        entityType: "areaGoals",
        entityId: "list",
        summary: `Updated area goals (${next.length})`,
      });
    },
    [persistPlanner, logActivity],
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
      void persistPlanner(
        "series",
        next as Array<Record<string, unknown> & { id: string }>,
      );
      void logActivity({
        action: "update",
        entityType: "series",
        entityId: "calendar",
        summary: `Updated calendar series (${next.length})`,
      });
    },
    [persistPlanner, logActivity],
  );

  const onCheckInsChange = useCallback(
    (next: Record<string, BlockCheckIn>) => {
      setCheckIns(next);
      const uid = plannerUidRef.current;
      if (!uid) return;
      if (isDemo) {
        void replaceDemoCheckIns(uid, next);
      } else {
        void replaceCheckIns(usersRoot(uid), next);
      }
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

  if (!dataReady) {
    return (
      <main className="shell">
        <p className="muted">
          {dataLoadError
            ? `${isDemo ? "Demo" : "Personal"} Firestore error: ${dataLoadError}`
            : isDemo
              ? "Loading demo from Firestore…"
              : "Loading your plan from Firestore…"}
        </p>
        {dataLoadError ? (
          <button type="button" className="secondary" onClick={signOut}>
            Sign out
          </button>
        ) : null}
      </main>
    );
  }

  const plannerNavActive = appView === "planner" || appView === "weeks";
  const showFocusSide = showsTasksToFocus(layerMode) && !isPhone;
  const tz = "Asia/Kolkata";

  const navButtons: { id: AppView; label: string }[] = [
    { id: "scheduler", label: isPhone ? "Today" : "Scheduler" },
    { id: "planner", label: "Planner" },
    { id: "calendar", label: "Calendar" },
    { id: "activity", label: "Activity" },
  ];

  return (
    <SecondClockProvider>
      <main
        className={`shell shell-wide${isPhone ? " shell-phone" : ""}`}
      >
        <header className="brand brand-row">
          <div>
            <h1>Samaya Scheduler</h1>
            <p className="lede">
              {isDemo ? "Demo mode · " : ""}
              {view?.displayName || user.email || user.uid}
              {isDemo
                ? " · Firestore demo/{uid}"
                : " · Firestore users/{uid}"}
            </p>
          </div>
          <div className="header-actions">
            {!isPhone ? (
              <nav className="app-nav" aria-label="App views">
                {navButtons.map((btn) => (
                  <button
                    key={btn.id}
                    type="button"
                    className={
                      (btn.id === "planner" ? plannerNavActive : appView === btn.id)
                        ? "nav-active"
                        : "secondary"
                    }
                    onClick={() => setAppView(btn.id)}
                  >
                    {btn.label}
                  </button>
                ))}
              </nav>
            ) : null}
            <div className="header-session">
              {!isPhone ? (
                <button
                  type="button"
                  className="secondary"
                  disabled={busy}
                  onClick={signOut}
                >
                  Sign out
                </button>
              ) : null}
              <LiveClock timeZone={tz} />
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
            timezone={tz}
            onOpenDay={(dateKey) => {
              setAnchorDate(dateKey);
              setAppView("scheduler");
            }}
            onAddItem={(dateKey) => {
              setAnchorDate(dateKey);
              setFabScheduleDate(dateKey);
              setAppView("scheduler");
              setFabOpen(true);
            }}
          />
        ) : appView === "activity" ? (
          <ActivityLog entries={activityEntries} />
        ) : appView === "more" ? (
          <section className="more-panel" aria-label="More">
            <h2>More</h2>
            <div className="sheet-actions">
              <button
                type="button"
                className="tap-target"
                onClick={() => setAppView("weeks")}
              >
                Week overview
              </button>
              <button
                type="button"
                className="secondary tap-target"
                disabled={busy}
                onClick={signOut}
              >
                Sign out
              </button>
            </div>
          </section>
        ) : (
          <div
            className={
              showFocusSide
                ? "scheduler-layout"
                : "scheduler-layout scheduler-layout-combined"
            }
          >
            <div className="scheduler-main">
              {needsSetup ? (
                <p className="muted" role="status">
                  Empty plan — add areas in Planner, or run setup when available.
                  Demo classes are not shown on personal accounts.
                </p>
              ) : null}
              {isPhone ? (
                <DayAgenda
                  isDemo={isDemo}
                  areas={areas}
                  timezone={tz}
                  anchorDate={anchorDate}
                  tasks={tasks}
                  onTasksChange={onTasksChange}
                  placedBlocks={blocks}
                  onPlacedBlocksChange={onBlocksChange}
                  bands={bands}
                  routines={routines}
                  schedules={schedules}
                  dayTypes={
                    isDemo ? fictionalSeed.dayTypes : dayTypes
                  }
                  checkIns={checkIns}
                  onCheckInsChange={onCheckInsChange}
                />
              ) : (
                <DayGrid
                  isDemo={isDemo}
                  areas={areas}
                  timezone={tz}
                  anchorDate={anchorDate}
                  tasks={tasks}
                  onTasksChange={onTasksChange}
                  placedBlocks={blocks}
                  onPlacedBlocksChange={onBlocksChange}
                  layerMode={layerMode}
                  onLayerModeChange={onLayerModeChange}
                  bands={bands}
                  routines={routines}
                  schedules={schedules}
                  dayTypes={
                    isDemo ? fictionalSeed.dayTypes : dayTypes
                  }
                  checkIns={checkIns}
                  onCheckInsChange={onCheckInsChange}
                />
              )}
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

        {isPhone ? (
          <>
            <button
              type="button"
              className="fab-add tap-target"
              aria-label="Add task"
              onClick={() => {
                setFabScheduleDate(undefined);
                setFabOpen(true);
              }}
            >
              +
            </button>
            <nav className="tab-bar" aria-label="App tabs">
              {[
                ...navButtons,
                { id: "more" as AppView, label: "More" },
              ].map((btn) => (
                <button
                  key={btn.id}
                  type="button"
                  className={
                    (btn.id === "planner"
                      ? plannerNavActive
                      : appView === btn.id) ||
                    (btn.id === "more" && appView === "weeks")
                      ? "nav-active"
                      : "secondary"
                  }
                  onClick={() => setAppView(btn.id)}
                >
                  {btn.label}
                </button>
              ))}
            </nav>
          </>
        ) : null}

        <BottomSheet
          open={fabOpen}
          title="Add task"
          onClose={() => {
            setFabOpen(false);
            setFabScheduleDate(undefined);
          }}
        >
          <TaskEditor
            key={fabScheduleDate || "today"}
            areas={areas}
            showSchedule
            defaultScheduleDate={
              fabScheduleDate || dateKeyInTz(new Date(), tz)
            }
            submitLabel="Add"
            onCancel={() => {
              setFabOpen(false);
              setFabScheduleDate(undefined);
            }}
            onSave={({ task, schedule }) => {
              let nextTasks = [
                { ...task, id: task.id || `task-${Date.now()}` },
                ...tasks,
              ];
              if (schedule) {
                const block = placedBlockFromSchedule(
                  nextTasks[0]!,
                  schedule,
                  areas,
                );
                nextTasks = nextTasks.map((t, i) =>
                  i === 0 ? { ...t, status: "scheduled" } : t,
                );
                onBlocksChange([...blocks, block]);
              }
              onTasksChange(nextTasks);
              setFabOpen(false);
              setFabScheduleDate(undefined);
              setAppView("scheduler");
            }}
          />
        </BottomSheet>

        {error ? <p className="error">{error}</p> : null}
      </main>
    </SecondClockProvider>
  );
}
