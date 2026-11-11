import { useMemo, useState, type FormEvent } from "react";
import type { SeedArea } from "@/data/fictional-seed";
import type { PlacedBlock } from "@/lib/blocks";
import {
  carryOverUnfinished,
  goalsForWeek,
  isUnfinished,
  isoWeekPeriod,
  nextGoalId,
  nextIsoWeekPeriod,
  previousIsoWeekPeriod,
  type WeeklyGoal,
} from "@/lib/goals";
import {
  evaluateWeekMinimums,
  type DailyRule,
} from "@/lib/rules";

type Props = {
  areas: SeedArea[];
  goals: WeeklyGoal[];
  onGoalsChange: (goals: WeeklyGoal[]) => void;
  rules?: DailyRule[];
  placedBlocks?: PlacedBlock[];
  timezone?: string;
};

/** Starred weekly goals by area + ISO week, with one-click carry-over (US-E2). */
export function WeeklyGoals({
  areas,
  goals,
  onGoalsChange,
  rules = [],
  placedBlocks = [],
  timezone = "Asia/Kolkata",
}: Props) {
  const orderedAreas = [...areas].sort((a, b) => a.order - b.order);
  const thisWeek = useMemo(
    () => isoWeekPeriod(new Date(), timezone),
    [timezone],
  );
  const [period, setPeriod] = useState(thisWeek);
  const [areaId, setAreaId] = useState(orderedAreas[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [carryMsg, setCarryMsg] = useState<string | null>(null);

  const weekGoals = goalsForWeek(goals, period);
  const unfinishedCount = weekGoals.filter(isUnfinished).length;
  const nextPeriod = nextIsoWeekPeriod(period);
  const weekMinimums = useMemo(() => {
    if (!rules.length) return [];
    const items = placedBlocks.map((b) => ({
      date: b.date,
      start: b.start,
      end: b.end,
      areaId: b.areaId,
      kind: "block" as const,
    }));
    return evaluateWeekMinimums(period, rules, items, timezone).map((row) => {
      const area = areas.find((a) => a.id === row.areaId);
      return {
        ...row,
        name: area?.name ?? row.label,
        colour: area?.colour ?? "#6b7280",
      };
    });
  }, [areas, period, placedBlocks, rules, timezone]);

  function resetForm(nextArea = orderedAreas[0]?.id ?? "") {
    setEditingId(null);
    setTitle("");
    setAreaId(nextArea);
  }

  function startEdit(goal: WeeklyGoal) {
    setEditingId(goal.id);
    setAreaId(goal.areaId);
    setTitle(goal.title);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || !areaId) return;

    if (editingId) {
      onGoalsChange(
        goals.map((g) =>
          g.id === editingId
            ? { ...g, areaId, title: trimmed, starred: true, period }
            : g,
        ),
      );
    } else {
      onGoalsChange([
        ...goals,
        {
          id: nextGoalId(goals),
          horizon: "week",
          period,
          areaId,
          title: trimmed,
          starred: true,
          progress: 0,
        },
      ]);
    }
    resetForm(areaId);
    setCarryMsg(null);
  }

  function removeGoal(id: string) {
    if (!window.confirm("Remove this weekly goal?")) return;
    onGoalsChange(goals.filter((g) => g.id !== id));
    if (editingId === id) resetForm(areaId);
    setCarryMsg(null);
  }

  function toggleDone(goal: WeeklyGoal) {
    onGoalsChange(
      goals.map((g) =>
        g.id === goal.id
          ? { ...g, progress: isUnfinished(g) ? 100 : 0 }
          : g,
      ),
    );
    setCarryMsg(null);
  }

  function onCarryOver() {
    const { goals: next, carried } = carryOverUnfinished(
      goals,
      period,
      nextPeriod,
    );
    onGoalsChange(next);
    setCarryMsg(
      carried === 0
        ? unfinishedCount === 0
          ? "Nothing to carry — all goals are done."
          : "Already carried — matching titles exist next week."
        : `Carried ${carried} unfinished goal${carried === 1 ? "" : "s"} to ${nextPeriod}.`,
    );
    if (carried > 0) setPeriod(nextPeriod);
  }

  return (
    <section className="weekly-goals" aria-label="Weekly goals">
      <div className="day-grid-meta">
        <h2>Weekly goals</h2>
        <p className="muted">
          Starred aims for an ISO week per life area. Carry unfinished goals
          into next week in one click. Daily minimums appear below as a soft
          retrospective (allocated vs planned) — not scheduling blockers.
        </p>
      </div>

      {weekMinimums.length > 0 ? (
        <div
          className="week-min-retro"
          role="region"
          aria-label="Weekly minimums retrospective"
        >
          <div className="week-min-retro-head">
            <strong>Minimums this week</strong>
            <span className="muted">
              Soft metric · allocated may deviate from planned min
            </span>
          </div>
          <ul className="week-min-retro-list">
            {weekMinimums.map((row) => (
              <li key={row.areaId} className="week-min-retro-row">
                <span
                  className="swatch"
                  style={{ background: row.colour }}
                  aria-hidden
                />
                <span className="week-min-retro-name">{row.name}</span>
                <span className="muted">
                  {row.allocated}m allocated · {row.plannedMin}m planned min
                  {row.allocated < row.plannedMin
                    ? ` · ${row.plannedMin - row.allocated}m under`
                    : row.allocated > row.plannedMin
                      ? ` · ${row.allocated - row.plannedMin}m over`
                      : " · on target"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : rules.length === 0 ? (
        <p className="muted hint-inline">
          No daily minimums configured — set them under Planner → area gear
          for this retrospective.
        </p>
      ) : null}

      <div className="week-toolbar one-off-row">
        <button
          type="button"
          className="secondary"
          onClick={() => {
            setPeriod(previousIsoWeekPeriod(period));
            setCarryMsg(null);
          }}
        >
          ← Prev
        </button>
        <strong className="week-label" aria-live="polite">
          {period}
          {period === thisWeek ? " · this week" : ""}
        </strong>
        <button
          type="button"
          className="secondary"
          onClick={() => {
            setPeriod(nextIsoWeekPeriod(period));
            setCarryMsg(null);
          }}
        >
          Next →
        </button>
        {period !== thisWeek ? (
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setPeriod(thisWeek);
              setCarryMsg(null);
            }}
          >
            This week
          </button>
        ) : null}
        <button
          type="button"
          onClick={onCarryOver}
          disabled={unfinishedCount === 0}
          title={`Copy unfinished goals to ${nextPeriod}`}
        >
          Carry unfinished to {nextPeriod}
        </button>
      </div>
      {carryMsg ? <p className="hint-inline">{carryMsg}</p> : null}

      <form className="task-form focus-form" onSubmit={onSubmit}>
        <div className="one-off-row">
          <label>
            Area
            <select
              value={areaId}
              onChange={(e) => setAreaId(e.target.value)}
              required
            >
              {orderedAreas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label className="focus-title-field">
            Goal
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Ship sprint demo"
              required
            />
          </label>
          <button type="submit">{editingId ? "Save" : "Add starred"}</button>
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

      {orderedAreas.length === 0 ? (
        <p className="muted">Create a life area in Planner first.</p>
      ) : (
        <div className="focus-columns">
          {orderedAreas.map((area) => {
            const column = goalsForWeek(goals, period, area.id);
            return (
              <div key={area.id} className="focus-column">
                <header className="focus-column-head">
                  <span
                    className="swatch"
                    style={{ background: area.colour }}
                    aria-hidden
                  />
                  <h3>{area.name}</h3>
                </header>
                {column.length === 0 ? (
                  <p className="muted hint-inline">No goals this week.</p>
                ) : (
                  <ul className="focus-list">
                    {column.map((goal) => (
                      <li
                        key={goal.id}
                        className={
                          isUnfinished(goal)
                            ? "focus-item goal-item"
                            : "focus-item goal-item goal-done"
                        }
                      >
                        <div className="task-main">
                          <strong>
                            {goal.starred ? "★ " : ""}
                            {goal.title}
                          </strong>
                          <span className="muted">
                            {isUnfinished(goal)
                              ? `In progress · ${goal.progress}%`
                              : "Done"}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => toggleDone(goal)}
                        >
                          {isUnfinished(goal) ? "Mark done" : "Reopen"}
                        </button>
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
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
