import { useState, type FormEvent } from "react";
import type { SeedArea } from "@/data/fictional-seed";
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
};

/** Life areas + daily minimums (US-C3 config, off the planner). */
export function AreasConfig({
  areas,
  onAreasChange,
  rules,
  onRulesChange,
}: Props) {
  const [name, setName] = useState("");
  const [colour, setColour] = useState(DEFAULT_AREA_COLOURS[0]!);

  function onAddArea(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const order =
      (areas.reduce((max, a) => Math.max(max, a.order), 0) || 0) + 1;
    onAreasChange([
      ...areas,
      { id: nextAreaId(areas), name: trimmed, colour, order },
    ]);
    setName("");
    setColour(
      DEFAULT_AREA_COLOURS[areas.length % DEFAULT_AREA_COLOURS.length]!,
    );
  }

  function updateArea(id: string, patch: Partial<SeedArea>) {
    onAreasChange(areas.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }

  function removeArea(id: string) {
    if (!window.confirm("Delete this area? Its daily minimums will be removed."))
      return;
    onAreasChange(areas.filter((a) => a.id !== id));
    onRulesChange(rules.filter((r) => r.areaId !== id));
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

  const ordered = [...areas].sort((a, b) => a.order - b.order);

  return (
    <section className="areas-config" aria-label="Areas and daily minimums">
      <div className="day-grid-meta">
        <h2>Areas</h2>
        <p className="muted">
          Create life areas and set daily minimums here. The planner shows
          shortfall badges and can suggest a free slot (never auto-places).
        </p>
      </div>

      <form className="task-form" onSubmit={onAddArea}>
        <div className="one-off-row">
          <label>
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Health"
              required
            />
          </label>
          <label>
            Colour
            <input
              type="color"
              value={colour}
              onChange={(e) => setColour(e.target.value)}
            />
          </label>
          <button type="submit">Add area</button>
        </div>
      </form>

      <ul className="area-config-list">
        {ordered.map((area) => {
          const areaRules = rules.filter((r) => r.areaId === area.id);
          return (
            <li key={area.id} className="area-config-card">
              <div className="area-config-head">
                <input
                  type="color"
                  value={area.colour}
                  onChange={(e) =>
                    updateArea(area.id, { colour: e.target.value })
                  }
                  aria-label={`${area.name} colour`}
                />
                <input
                  className="area-name-input"
                  value={area.name}
                  onChange={(e) =>
                    updateArea(area.id, { name: e.target.value })
                  }
                  aria-label="Area name"
                />
                <button
                  type="button"
                  className="secondary"
                  onClick={() => removeArea(area.id)}
                >
                  Delete
                </button>
              </div>

              <div className="area-rules">
                <div className="area-rules-head">
                  <strong>Daily minimums</strong>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => addRule(area.id)}
                  >
                    Add minimum
                  </button>
                </div>
                {areaRules.length === 0 ? (
                  <p className="muted hint-inline">No daily minimum.</p>
                ) : (
                  <ul className="rule-list">
                    {areaRules.map((rule) => (
                      <li key={rule.id} className="rule-row">
                        <div className="task-main">
                          <strong>
                            {rule.label || `${area.name} minimum`}
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
            </li>
          );
        })}
      </ul>
    </section>
  );
}
