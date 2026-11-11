import { useState, type FormEvent } from "react";
import { GoalsGantt } from "@/components/GoalsGantt";
import type { SeedArea } from "@/data/fictional-seed";
import type { AreaGoal } from "@/lib/area-goals";
import {
  DEFAULT_AREA_COLOURS,
  nextAreaId,
} from "@/lib/areas";
import type { DailyRule } from "@/lib/rules";

type Props = {
  areas: SeedArea[];
  onAreasChange: (areas: SeedArea[]) => void;
  rules: DailyRule[];
  onRulesChange: (rules: DailyRule[]) => void;
  areaGoals: AreaGoal[];
  onAreaGoalsChange: (goals: AreaGoal[]) => void;
  onOpenWeekOverview?: () => void;
  onAddGoalToWeekBacklog?: (goal: AreaGoal) => void;
  weekBacklogGoalIds?: ReadonlySet<string>;
};

/** Planner surface: area cards in one row; gear opens config (US-C3). */
export function PlannerAreas({
  areas,
  onAreasChange,
  rules,
  onRulesChange,
  areaGoals,
  onAreaGoalsChange,
  onOpenWeekOverview,
  onAddGoalToWeekBacklog,
  weekBacklogGoalIds,
}: Props) {
  const [name, setName] = useState("");
  const [colour, setColour] = useState(DEFAULT_AREA_COLOURS[0]!);
  const [configAreaId, setConfigAreaId] = useState<string | null>(null);

  function onAddArea(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const order =
      (areas.reduce((max, a) => Math.max(max, a.order), 0) || 0) + 1;
    const id = nextAreaId(areas);
    onAreasChange([
      ...areas,
      { id, name: trimmed, colour, order },
    ]);
    setName("");
    setColour(
      DEFAULT_AREA_COLOURS[areas.length % DEFAULT_AREA_COLOURS.length]!,
    );
    setConfigAreaId(id);
  }

  function updateArea(id: string, patch: Partial<SeedArea>) {
    onAreasChange(areas.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }

  function removeArea(id: string) {
    if (!window.confirm("Delete this area? Its daily minimums will be removed."))
      return;
    onAreasChange(areas.filter((a) => a.id !== id));
    onRulesChange(rules.filter((r) => r.areaId !== id));
    onAreaGoalsChange(areaGoals.filter((g) => g.areaId !== id));
    if (configAreaId === id) setConfigAreaId(null);
  }

  function addRule(areaId: string) {
    const raw = window.prompt("Min minutes per day (e.g. 90)", "60");
    if (raw == null) return;
    const minutes = Number(raw);
    if (!Number.isFinite(minutes) || minutes < 15) return;
    const area = areas.find((a) => a.id === areaId);
    onRulesChange([
      ...rules,
      {
        id: `rule-${Date.now()}`,
        areaId,
        minMinutesPerDay: Math.round(minutes),
        label: area ? `${area.name} minimum` : undefined,
      },
    ]);
  }

  function editRule(rule: DailyRule) {
    const raw = window.prompt(
      "Min minutes per day",
      String(rule.minMinutesPerDay),
    );
    if (raw == null) return;
    const minutes = Number(raw);
    if (!Number.isFinite(minutes) || minutes < 15) return;
    onRulesChange(
      rules.map((r) =>
        r.id === rule.id
          ? { ...r, minMinutesPerDay: Math.round(minutes) }
          : r,
      ),
    );
  }

  function removeRule(id: string) {
    if (!window.confirm("Delete this daily minimum?")) return;
    onRulesChange(rules.filter((r) => r.id !== id));
  }

  function toggleConfig(areaId: string) {
    setConfigAreaId((prev) => (prev === areaId ? null : areaId));
  }

  const ordered = [...areas].sort((a, b) => a.order - b.order);
  const configArea = ordered.find((a) => a.id === configAreaId) ?? null;
  const configRules = configArea
    ? rules.filter((r) => r.areaId === configArea.id)
    : [];

  return (
    <section className="planner-areas" aria-label="Planner areas">
      <div className="day-grid-meta">
        <h2>Planner</h2>
        <p className="muted">
          Life areas at a glance. Open the config icon for daily minimums;
          the scheduler shows shortfall badges and can suggest a free slot
          (never auto-places).
        </p>
      </div>

      <ul className="planner-area-row">
        {ordered.map((area) => {
          const areaRules = rules.filter((r) => r.areaId === area.id);
          const mins = areaRules.reduce(
            (sum, r) => sum + r.minMinutesPerDay,
            0,
          );
          const open = configAreaId === area.id;
          return (
            <li key={area.id}>
              <article
                className={
                  open ? "planner-area-card is-open" : "planner-area-card"
                }
                style={{ ["--area-colour" as string]: area.colour }}
              >
                <span
                  className="planner-area-swatch"
                  aria-hidden="true"
                  style={{ background: area.colour }}
                />
                <div className="planner-area-body">
                  <strong className="planner-area-name">{area.name}</strong>
                  <span className="muted planner-area-meta">
                    {areaRules.length === 0
                      ? "No daily minimum"
                      : `≥ ${mins}m / day`}
                  </span>
                </div>
                <button
                  type="button"
                  className="planner-area-gear secondary"
                  aria-label={`Configure ${area.name}`}
                  aria-expanded={open}
                  aria-controls={
                    open ? "planner-area-config-panel" : undefined
                  }
                  onClick={() => toggleConfig(area.id)}
                >
                  <GearIcon />
                </button>
              </article>
            </li>
          );
        })}
        <li className="planner-area-add-slot">
          <form className="planner-area-add" onSubmit={onAddArea}>
            <label className="sr-only" htmlFor="planner-new-area-name">
              New area name
            </label>
            <input
              id="planner-new-area-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Add area"
              required
            />
            <label className="sr-only" htmlFor="planner-new-area-colour">
              Colour
            </label>
            <input
              id="planner-new-area-colour"
              type="color"
              value={colour}
              onChange={(e) => setColour(e.target.value)}
              aria-label="New area colour"
            />
            <button type="submit">Add</button>
          </form>
        </li>
      </ul>

      {configArea ? (
        <div
          id="planner-area-config-panel"
          className="planner-area-config"
          role="region"
          aria-label={`${configArea.name} settings`}
        >
          <div className="area-config-head">
            <input
              type="color"
              value={configArea.colour}
              onChange={(e) =>
                updateArea(configArea.id, { colour: e.target.value })
              }
              aria-label={`${configArea.name} colour`}
            />
            <input
              className="area-name-input"
              value={configArea.name}
              onChange={(e) =>
                updateArea(configArea.id, { name: e.target.value })
              }
              aria-label="Area name"
            />
            <button
              type="button"
              className="secondary"
              onClick={() => removeArea(configArea.id)}
            >
              Delete
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => setConfigAreaId(null)}
            >
              Close
            </button>
          </div>

          <div className="area-rules">
            <div className="area-rules-head">
              <strong>Daily minimums</strong>
              <button
                type="button"
                className="secondary"
                onClick={() => addRule(configArea.id)}
              >
                Add minimum
              </button>
            </div>
            {configRules.length === 0 ? (
              <p className="muted hint-inline">No daily minimum.</p>
            ) : (
              <ul className="rule-list">
                {configRules.map((rule) => (
                  <li key={rule.id} className="rule-row">
                    <div className="task-main">
                      <strong>
                        {rule.label || `${configArea.name} minimum`}
                      </strong>
                      <span className="muted">
                        ≥ {rule.minMinutesPerDay}m / day
                      </span>
                    </div>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => editRule(rule)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => removeRule(rule.id)}
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      <GoalsGantt
        areas={areas}
        goals={areaGoals}
        onGoalsChange={onAreaGoalsChange}
        onOpenWeekOverview={onOpenWeekOverview}
        onAddToWeekBacklog={onAddGoalToWeekBacklog}
        weekBacklogGoalIds={weekBacklogGoalIds}
      />
    </section>
  );
}

function GearIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6.4 1.5h3.2l.35 1.4a4.8 4.8 0 0 1 1.15.66l1.4-.45 1.6 2.77-1.15 1a4.9 4.9 0 0 1 0 1.34l1.15 1-1.6 2.77-1.4-.45a4.8 4.8 0 0 1-1.15.66l-.35 1.4H6.4l-.35-1.4a4.8 4.8 0 0 1-1.15-.66l-1.4.45L2 10.22l1.15-1a4.9 4.9 0 0 1 0-1.34L2 6.88l1.6-2.77 1.4.45a4.8 4.8 0 0 1 1.15-.66L6.4 1.5Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
