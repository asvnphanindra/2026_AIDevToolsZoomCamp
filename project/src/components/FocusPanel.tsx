import { useState, type FormEvent } from "react";
import type { SeedArea } from "@/data/fictional-seed";
import {
  itemsForArea,
  nextFocusId,
  type FocusItem,
} from "@/lib/focus";

type Props = {
  areas: SeedArea[];
  items: FocusItem[];
  onItemsChange: (items: FocusItem[]) => void;
  /** When embedded under Planner Backlog (default). */
  embedded?: boolean;
};

/** Standing focus items by life area (US-E1) — lives under Planner Backlog. */
export function FocusPanel({
  areas,
  items,
  onItemsChange,
  embedded = true,
}: Props) {
  const orderedAreas = [...areas].sort((a, b) => a.order - b.order);
  const [areaId, setAreaId] = useState(orderedAreas[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  function resetForm(nextArea = orderedAreas[0]?.id ?? "") {
    setEditingId(null);
    setTitle("");
    setSubtitle("");
    setAreaId(nextArea);
  }

  function startEdit(item: FocusItem) {
    setEditingId(item.id);
    setAreaId(item.areaId);
    setTitle(item.title);
    setSubtitle(item.subtitle ?? "");
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || !areaId) return;

    if (editingId) {
      onItemsChange(
        items.map((i) =>
          i.id === editingId
            ? {
                ...i,
                areaId,
                title: trimmed,
                subtitle: subtitle.trim() || undefined,
              }
            : i,
        ),
      );
    } else {
      const siblings = itemsForArea(items, areaId);
      const order =
        (siblings.reduce((max, i) => Math.max(max, i.order), 0) || 0) + 1;
      onItemsChange([
        ...items,
        {
          id: nextFocusId(items),
          areaId,
          title: trimmed,
          subtitle: subtitle.trim() || undefined,
          order,
        },
      ]);
    }
    resetForm(areaId);
  }

  function removeItem(id: string) {
    if (!window.confirm("Remove this focus item?")) return;
    onItemsChange(items.filter((i) => i.id !== id));
    if (editingId === id) resetForm(areaId);
  }

  return (
    <section
      className={embedded ? "focus-panel focus-panel-embedded" : "focus-panel"}
      aria-label="Standing focus by life area"
    >
      <div className="day-grid-meta">
        <h3>{embedded ? "Standing focus" : "Focus"}</h3>
        <p className="muted">
          Standing items per life area — what should stay visible while you
          plan the week. Place work from Backlog via Scheduler → Focus.
        </p>
      </div>

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
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Ship sprint demo"
              required
            />
          </label>
          <label className="focus-subtitle-field">
            Subtitle
            <input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Optional detail"
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

      {orderedAreas.length === 0 ? (
        <p className="muted">Create a life area in Planner first.</p>
      ) : (
        <div className="focus-columns">
          {orderedAreas.map((area) => {
            const column = itemsForArea(items, area.id);
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
                  <p className="muted hint-inline">No focus items yet.</p>
                ) : (
                  <ul className="focus-list">
                    {column.map((item) => (
                      <li key={item.id} className="focus-item">
                        <div className="task-main">
                          <strong>{item.title}</strong>
                          {item.subtitle ? (
                            <span className="muted">{item.subtitle}</span>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => startEdit(item)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => removeItem(item.id)}
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
