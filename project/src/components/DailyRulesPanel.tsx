import { useState, type FormEvent } from "react";
import type { SeedArea } from "@/data/fictional-seed";
import type { DailyRule, RuleShortfall } from "@/lib/rules";

type Props = {
  areas: SeedArea[];
  rules: DailyRule[];
  onRulesChange: (rules: DailyRule[]) => void;
  /** Shortfalls for today (for suggest UX). */
  todayShortfalls: RuleShortfall[];
  onSuggest: (shortfall: RuleShortfall) => void;
};

/** US-C3 — configure daily minimums + suggest for shortfalls. */
export function DailyRulesPanel({
  areas,
  rules,
  onRulesChange,
  todayShortfalls,
  onSuggest,
}: Props) {
  const defaultArea = areas[0]?.id ?? "work";
  const [areaId, setAreaId] = useState(defaultArea);
  const [minutes, setMinutes] = useState(60);
  const [label, setLabel] = useState("");

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!areaId || minutes < 15) return;
    const entry: DailyRule = {
      id: `rule-${Date.now()}`,
      areaId,
      minMinutesPerDay: minutes,
      label: label.trim() || undefined,
    };
    onRulesChange([...rules, entry]);
    setLabel("");
    setMinutes(60);
  }

  function edit(rule: DailyRule) {
    const raw = window.prompt(
      `Min minutes/day for ${rule.label || rule.areaId}`,
      String(rule.minMinutesPerDay),
    );
    if (raw == null) return;
    const next = Number(raw);
    if (!Number.isFinite(next) || next < 15) return;
    onRulesChange(
      rules.map((r) =>
        r.id === rule.id ? { ...r, minMinutesPerDay: Math.round(next) } : r,
      ),
    );
  }

  function remove(id: string) {
    if (!window.confirm("Delete this daily minimum rule?")) return;
    onRulesChange(rules.filter((r) => r.id !== id));
  }

  return (
    <section className="daily-rules" aria-label="Daily minimum rules">
      <div className="day-grid-meta">
        <h2>Daily minimums</h2>
        <p className="muted">
          Area + minutes/day. Badges on the grid when short; suggest never
          auto-places (US-C3).
        </p>
      </div>

      <form className="task-form" onSubmit={onSubmit}>
        <div className="one-off-row">
          <label>
            Area
            <select
              value={areaId}
              onChange={(e) => setAreaId(e.target.value)}
              required
            >
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Min minutes/day
            <input
              type="number"
              min={15}
              step={15}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              required
            />
          </label>
          <label>
            Label (optional)
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Deep work"
            />
          </label>
          <button type="submit">Add rule</button>
        </div>
      </form>

      <ul className="rule-list">
        {rules.map((rule) => {
          const area = areas.find((a) => a.id === rule.areaId);
          return (
            <li key={rule.id} className="rule-row">
              <span
                className="swatch"
                style={{ background: area?.colour ?? "#666" }}
                aria-hidden
              />
              <div className="task-main">
                <strong>{rule.label || area?.name || rule.areaId}</strong>
                <span className="muted">
                  {area?.name ?? rule.areaId} · ≥ {rule.minMinutesPerDay}m / day
                </span>
              </div>
              <button
                type="button"
                className="secondary"
                onClick={() => edit(rule)}
              >
                Edit
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => remove(rule.id)}
              >
                Delete
              </button>
            </li>
          );
        })}
      </ul>

      {todayShortfalls.length > 0 ? (
        <div className="rule-suggest">
          <p className="muted">Today’s shortfalls — suggest a free slot:</p>
          <div className="actions">
            {todayShortfalls.map((s) => (
              <button
                key={s.ruleId}
                type="button"
                className="secondary"
                onClick={() => onSuggest(s)}
              >
                Suggest {s.label} (−{s.missing}m)
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="muted hint-inline">Today meets all daily minimums.</p>
      )}
    </section>
  );
}
