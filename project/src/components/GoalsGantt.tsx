import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { SeedArea } from "@/data/fictional-seed";
import {
  HORIZON_LABELS,
  barPosition,
  defaultRangeForHorizon,
  ganttWindow,
  goalsForArea,
  monthTicks,
  nextAreaGoalId,
  weekTicks,
  type AreaGoal,
  type GoalHorizonKind,
} from "@/lib/area-goals";

type Props = {
  areas: SeedArea[];
  goals: AreaGoal[];
  onGoalsChange: (goals: AreaGoal[]) => void;
  timezone?: string;
  onOpenWeekOverview?: () => void;
  /** Create a weekly Planner Backlog card from a Gantt goal. */
  onAddToWeekBacklog?: (goal: AreaGoal) => void;
  /** Goal ids already on this week’s open backlog (disable re-add). */
  weekBacklogGoalIds?: ReadonlySet<string>;
  /** Controlled area filter (shared with Planner Backlog below). */
  areaId?: string;
  onAreaIdChange?: (areaId: string) => void;
};

const HORIZONS: GoalHorizonKind[] = ["short", "mid", "long"];

/** Per-area Goals Gantt with dropdown filter and shared ~3-quarter timeline. */
export function GoalsGantt({
  areas,
  goals,
  onGoalsChange,
  timezone = "Asia/Kolkata",
  onOpenWeekOverview,
  onAddToWeekBacklog,
  weekBacklogGoalIds,
  areaId: controlledAreaId,
  onAreaIdChange,
}: Props) {
  const orderedAreas = useMemo(
    () => [...areas].sort((a, b) => a.order - b.order),
    [areas],
  );

  const [uncontrolledAreaId, setUncontrolledAreaId] = useState(
    orderedAreas[0]?.id ?? "",
  );
  const areaId = controlledAreaId ?? uncontrolledAreaId;
  const setAreaId = onAreaIdChange ?? setUncontrolledAreaId;
  const [title, setTitle] = useState("");
  const [horizon, setHorizon] = useState<GoalHorizonKind>("short");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const timeline = useMemo(
    () => ganttWindow(new Date(), timezone),
    [timezone],
  );
  const months = useMemo(
    () => monthTicks(timeline.startDate, timeline.totalDays),
    [timeline],
  );
  const weeks = useMemo(
    () => weekTicks(timeline.startDate, timeline.totalDays, timezone),
    [timeline, timezone],
  );

  useEffect(() => {
    if (!orderedAreas.some((a) => a.id === areaId)) {
      setAreaId(orderedAreas[0]?.id ?? "");
    }
  }, [orderedAreas, areaId, setAreaId]);

  useEffect(() => {
    if (editingId) return;
    const range = defaultRangeForHorizon(horizon, new Date(), timezone);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  }, [horizon, timezone, editingId]);

  const areaGoals = areaId ? goalsForArea(goals, areaId) : [];
  const selectedArea = orderedAreas.find((a) => a.id === areaId);

  function resetForm(nextArea = areaId) {
    setEditingId(null);
    setTitle("");
    setHorizon("short");
    const range = defaultRangeForHorizon("short", new Date(), timezone);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
    setAreaId(nextArea);
  }

  function startEdit(goal: AreaGoal) {
    setEditingId(goal.id);
    setAreaId(goal.areaId);
    setTitle(goal.title);
    setHorizon(goal.horizon);
    setStartDate(goal.startDate);
    setEndDate(goal.endDate);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || !areaId || !startDate || !endDate) return;
    const start = startDate <= endDate ? startDate : endDate;
    const end = startDate <= endDate ? endDate : startDate;

    const next: AreaGoal = {
      id: editingId ?? nextAreaGoalId(goals),
      areaId,
      title: trimmed,
      horizon,
      startDate: start,
      endDate: end,
      progress: editingId
        ? goals.find((g) => g.id === editingId)?.progress
        : 0,
    };

    if (editingId) {
      onGoalsChange(goals.map((g) => (g.id === editingId ? next : g)));
    } else {
      onGoalsChange([...goals, next]);
    }
    resetForm(areaId);
  }

  function removeGoal(id: string) {
    if (!globalThis.confirm("Delete this goal?")) return;
    onGoalsChange(goals.filter((g) => g.id !== id));
    if (editingId === id) resetForm(areaId);
  }

  function shiftDateKey(dateKey: string, deltaDays: number): string {
    const [y, m, d] = dateKey.split("-").map(Number);
    const utc = new Date(Date.UTC(y!, m! - 1, d!, 12, 0, 0));
    utc.setUTCDate(utc.getUTCDate() + deltaDays);
    return utc.toISOString().slice(0, 10);
  }

  function nudgeStart(goal: AreaGoal, deltaDays: number) {
    const nextStart = shiftDateKey(goal.startDate, deltaDays);
    if (nextStart > goal.endDate) return;
    onGoalsChange(
      goals.map((g) =>
        g.id === goal.id ? { ...g, startDate: nextStart } : g,
      ),
    );
  }

  function nudgeEnd(goal: AreaGoal, deltaDays: number) {
    const nextEnd = shiftDateKey(goal.endDate, deltaDays);
    if (nextEnd < goal.startDate) return;
    onGoalsChange(
      goals.map((g) =>
        g.id === goal.id ? { ...g, endDate: nextEnd } : g,
      ),
    );
  }

  return (
    <section className="goals-gantt" aria-label="Goals Gantt">
      <div className="goals-gantt-head">
        <div>
          <h3>Goals</h3>
          <p className="muted">
            Per-area Gantt on a shared timeline — short (~3 weeks), mid
            (~3 months), long (~3 quarters). Pick an area, then{" "}
            <strong>→ This week</strong> to put a goal on the weekly Backlog
            below.
          </p>
        </div>
        <div className="goals-gantt-head-actions">
          <label className="goals-gantt-area-select">
            Area
            <select
              value={areaId}
              onChange={(e) => {
                setAreaId(e.target.value);
                if (!editingId) resetForm(e.target.value);
              }}
              disabled={orderedAreas.length === 0}
            >
              {orderedAreas.length === 0 ? (
                <option value="">No areas yet</option>
              ) : (
                orderedAreas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))
              )}
            </select>
          </label>
          {onOpenWeekOverview ? (
            <button
              type="button"
              className="secondary"
              onClick={onOpenWeekOverview}
            >
              3-week goals overview
            </button>
          ) : null}
        </div>
      </div>

      {orderedAreas.length === 0 ? (
        <p className="muted">Create a life area above first.</p>
      ) : (
        <>
          <form className="task-form focus-form goals-gantt-form" onSubmit={onSubmit}>
            <div className="one-off-row">
              <label className="focus-title-field">
                Goal
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Ship Gantt slice"
                  required
                />
              </label>
              <label>
                Horizon
                <select
                  value={horizon}
                  onChange={(e) =>
                    setHorizon(e.target.value as GoalHorizonKind)
                  }
                >
                  {HORIZONS.map((h) => (
                    <option key={h} value={h}>
                      {HORIZON_LABELS[h]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Start
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </label>
              <label>
                End
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </label>
              <button type="submit">{editingId ? "Save" : "Add"}</button>
              {editingId ? (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => resetForm(areaId)}
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>

          <div
            className="gantt-chart"
            style={{
              ["--area-colour" as string]:
                selectedArea?.colour ?? "#0F6B4C",
            }}
          >
            <div className="gantt-axis" aria-hidden="true">
              <div className="gantt-axis-months">
                {months.map((t) => (
                  <span
                    key={`m-${t.date}`}
                    className="gantt-tick gantt-tick-month"
                    style={{ left: `${t.left}%` }}
                  >
                    {t.label}
                  </span>
                ))}
              </div>
              <div className="gantt-axis-weeks">
                {weeks.map((t) => (
                  <span
                    key={`w-${t.period}`}
                    className="gantt-tick gantt-tick-week"
                    style={{ left: `${t.left}%` }}
                    title={t.period}
                  >
                    {t.label}
                  </span>
                ))}
              </div>
            </div>

            {HORIZONS.map((band) => {
              const bandGoals = areaGoals.filter((g) => g.horizon === band);
              return (
                <div key={band} className="gantt-band">
                  <div className="gantt-band-label">
                    <strong>{HORIZON_LABELS[band]}</strong>
                    <span className="muted">{bandGoals.length}</span>
                  </div>
                  <div className="gantt-track">
                    <div className="gantt-gridlines" aria-hidden="true">
                      {weeks.map((t) => (
                        <span
                          key={`gl-w-${band}-${t.period}`}
                          className="gantt-gridline gantt-gridline-week"
                          style={{ left: `${t.left}%` }}
                        />
                      ))}
                      {months.map((t) => (
                        <span
                          key={`gl-m-${band}-${t.date}`}
                          className="gantt-gridline gantt-gridline-month"
                          style={{ left: `${t.left}%` }}
                        />
                      ))}
                    </div>
                    {bandGoals.length === 0 ? (
                      <p className="muted hint-inline gantt-empty">
                        No {band} goals for this area.
                      </p>
                    ) : (
                      <ul className="gantt-rows">
                        {bandGoals.map((goal) => {
                          const pos = barPosition(
                            goal,
                            timeline.startDate,
                            timeline.totalDays,
                          );
                          return (
                            <li key={goal.id} className="gantt-row">
                              <div className="gantt-row-meta">
                                <strong>{goal.title}</strong>
                                <span className="muted">
                                  {goal.startDate} → {goal.endDate}
                                  {goal.progress != null
                                    ? ` · ${goal.progress}%`
                                    : ""}
                                </span>
                              </div>
                              <div className="gantt-row-track">
                                <div
                                  className="gantt-bar"
                                  style={{
                                    left: `${pos.left}%`,
                                    width: `${pos.width}%`,
                                  }}
                                  title={`${goal.title} (${goal.startDate} → ${goal.endDate})`}
                                >
                                  <span className="gantt-bar-label">
                                    {goal.title}
                                  </span>
                                  <button
                                    type="button"
                                    className="gantt-nudge gantt-nudge-start"
                                    aria-label={`Move start of “${goal.title}” earlier`}
                                    onClick={() => nudgeStart(goal, -1)}
                                  >
                                    ‹
                                  </button>
                                  <button
                                    type="button"
                                    className="gantt-nudge gantt-nudge-end"
                                    aria-label={`Extend end of “${goal.title}” by one day`}
                                    onClick={() => nudgeEnd(goal, 1)}
                                  >
                                    ›
                                  </button>
                                </div>
                              </div>
                              <div className="gantt-row-actions">
                                {onAddToWeekBacklog ? (
                                  <button
                                    type="button"
                                    className="secondary"
                                    disabled={weekBacklogGoalIds?.has(
                                      goal.id,
                                    )}
                                    title={
                                      weekBacklogGoalIds?.has(goal.id)
                                        ? "Already on this week’s Backlog"
                                        : "Add to this week’s Backlog"
                                    }
                                    onClick={() =>
                                      onAddToWeekBacklog(goal)
                                    }
                                  >
                                    {weekBacklogGoalIds?.has(goal.id)
                                      ? "On backlog"
                                      : "→ This week"}
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  className="secondary"
                                  onClick={() => startEdit(goal)}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="secondary"
                                  onClick={() => removeGoal(goal.id)}
                                >
                                  Delete
                                </button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
