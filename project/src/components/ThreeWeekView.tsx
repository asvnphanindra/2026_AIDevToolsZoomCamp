import { useMemo, useState, type FormEvent } from "react";
import type { SeedArea } from "@/data/fictional-seed";
import { formatDayLabel } from "@/lib/time";
import {
  itemsForDay,
  nextWeekHorizonId,
  threeWeekColumns,
  weekBucketItems,
  type WeekHorizonItem,
  type WeekPlacement,
} from "@/lib/week-horizon";

type Props = {
  areas: SeedArea[];
  items: WeekHorizonItem[];
  onItemsChange: (items: WeekHorizonItem[]) => void;
  timezone?: string;
};

/** Current + next two ISO weeks; day or sometime-this-week (US-E3). */
export function ThreeWeekView({
  areas,
  items,
  onItemsChange,
  timezone = "Asia/Kolkata",
}: Props) {
  const orderedAreas = [...areas].sort((a, b) => a.order - b.order);
  const columns = useMemo(
    () => threeWeekColumns(new Date(), timezone),
    [timezone],
  );

  const [period, setPeriod] = useState(columns[0]?.period ?? "");
  const [areaId, setAreaId] = useState(orderedAreas[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [placement, setPlacement] = useState<WeekPlacement>("week");
  const [date, setDate] = useState(columns[0]?.dayKeys[0] ?? "");
  const [editingId, setEditingId] = useState<string | null>(null);

  const activeColumn =
    columns.find((c) => c.period === period) ?? columns[0];

  function resetForm(nextPeriod = columns[0]?.period ?? "") {
    setEditingId(null);
    setTitle("");
    setPlacement("week");
    setPeriod(nextPeriod);
    setAreaId(orderedAreas[0]?.id ?? "");
    const col = columns.find((c) => c.period === nextPeriod) ?? columns[0];
    setDate(col?.dayKeys[0] ?? "");
  }

  function startEdit(item: WeekHorizonItem) {
    setEditingId(item.id);
    setTitle(item.title);
    setAreaId(item.areaId);
    setPeriod(item.period);
    setPlacement(item.placement);
    const col = columns.find((c) => c.period === item.period);
    setDate(item.date ?? col?.dayKeys[0] ?? "");
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || !areaId || !period) return;
    if (placement === "day" && !date) return;

    const nextItem: WeekHorizonItem = {
      id: editingId ?? nextWeekHorizonId(items),
      title: trimmed,
      areaId,
      period,
      placement,
      date: placement === "day" ? date : undefined,
      done: editingId
        ? items.find((i) => i.id === editingId)?.done
        : false,
    };

    if (editingId) {
      onItemsChange(
        items.map((i) => (i.id === editingId ? nextItem : i)),
      );
    } else {
      onItemsChange([...items, nextItem]);
    }
    resetForm(period);
  }

  function removeItem(id: string) {
    if (!window.confirm("Remove this 3-week item?")) return;
    onItemsChange(items.filter((i) => i.id !== id));
    if (editingId === id) resetForm(period);
  }

  function toggleDone(item: WeekHorizonItem) {
    onItemsChange(
      items.map((i) =>
        i.id === item.id ? { ...i, done: !i.done } : i,
      ),
    );
  }

  function moveToWeekBucket(item: WeekHorizonItem) {
    onItemsChange(
      items.map((i) =>
        i.id === item.id
          ? { ...i, placement: "week", date: undefined }
          : i,
      ),
    );
  }

  function moveToDay(item: WeekHorizonItem, dayKey: string) {
    onItemsChange(
      items.map((i) =>
        i.id === item.id
          ? { ...i, placement: "day", date: dayKey, period: item.period }
          : i,
      ),
    );
  }

  function renderCard(item: WeekHorizonItem, weekDays: string[]) {
    const area = orderedAreas.find((a) => a.id === item.areaId);
    return (
      <li
        key={item.id}
        className={
          item.done
            ? "focus-item goal-item goal-done week-horizon-item"
            : "focus-item goal-item week-horizon-item"
        }
      >
        <div className="task-main">
          <strong>
            <span
              className="swatch"
              style={{ background: area?.colour ?? "#0F6B4C" }}
              aria-hidden
            />{" "}
            {item.title}
          </strong>
          <span className="muted">
            {area?.name ?? item.areaId}
            {item.placement === "week"
              ? " · sometime this week"
              : item.date
                ? ` · ${formatDayLabel(item.date, timezone)}`
                : ""}
          </span>
        </div>
        <button
          type="button"
          className="secondary"
          onClick={() => toggleDone(item)}
        >
          {item.done ? "Reopen" : "Done"}
        </button>
        {item.placement === "day" ? (
          <button
            type="button"
            className="secondary"
            onClick={() => moveToWeekBucket(item)}
          >
            → Week
          </button>
        ) : (
          <label className="week-move-day">
            <span className="sr-only">Pin to day</span>
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) moveToDay(item, e.target.value);
              }}
              aria-label={`Pin “${item.title}” to a day`}
            >
              <option value="">→ Day…</option>
              {weekDays.map((key) => (
                <option key={key} value={key}>
                  {formatDayLabel(key, timezone)}
                </option>
              ))}
            </select>
          </label>
        )}
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
    );
  }

  return (
    <section className="three-week-view" aria-label="3-week view">
      <div className="day-grid-meta">
        <h2>3-week view</h2>
        <p className="muted">
          Current week and the next two as columns. Assign work to a day or
          sometime this week — no clock times required.
        </p>
      </div>

      <form className="task-form focus-form" onSubmit={onSubmit}>
        <div className="one-off-row">
          <label>
            Week
            <select
              value={period}
              onChange={(e) => {
                const next = e.target.value;
                setPeriod(next);
                const col = columns.find((c) => c.period === next);
                if (col?.dayKeys[0]) setDate(col.dayKeys[0]);
              }}
              required
            >
              {columns.map((c) => (
                <option key={c.period} value={c.period}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
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
            Task
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Outline module notes"
              required
            />
          </label>
          <label>
            When
            <select
              value={placement}
              onChange={(e) =>
                setPlacement(e.target.value as WeekPlacement)
              }
            >
              <option value="week">Sometime this week</option>
              <option value="day">Specific day</option>
            </select>
          </label>
          {placement === "day" ? (
            <label>
              Day
              <select
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              >
                {(activeColumn?.dayKeys ?? []).map((key) => (
                  <option key={key} value={key}>
                    {formatDayLabel(key, timezone)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <button type="submit">{editingId ? "Save" : "Add"}</button>
          {editingId ? (
            <button
              type="button"
              className="secondary"
              onClick={() => resetForm(period)}
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <div className="three-week-columns">
        {columns.map((col) => {
          const bucket = weekBucketItems(items, col.period);
          return (
            <div key={col.period} className="three-week-column">
              <header className="focus-column-head">
                <h3>{col.label}</h3>
              </header>

              <div className="week-bucket">
                <h4>Sometime this week</h4>
                {bucket.length === 0 ? (
                  <p className="muted hint-inline">Nothing bucketed yet.</p>
                ) : (
                  <ul className="focus-list">
                    {bucket.map((item) => renderCard(item, col.dayKeys))}
                  </ul>
                )}
              </div>

              <div className="week-days">
                {col.dayKeys.map((dayKey) => {
                  const dayItems = itemsForDay(items, dayKey);
                  return (
                    <div key={dayKey} className="week-day-row">
                      <h4>{formatDayLabel(dayKey, timezone)}</h4>
                      {dayItems.length === 0 ? (
                        <p className="muted hint-inline">—</p>
                      ) : (
                        <ul className="focus-list">
                          {dayItems.map((item) =>
                            renderCard(item, col.dayKeys),
                          )}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
