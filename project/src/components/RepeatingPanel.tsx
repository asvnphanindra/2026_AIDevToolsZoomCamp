import type { DragEvent } from "react";
import type { SeedArea } from "@/data/fictional-seed";
import {
  REPEAT_DRAG_MIME,
  seedRepeatingTasks,
  type RepeatingTask,
} from "@/lib/repeating";

type Props = {
  areas: SeedArea[];
};

/** Place-only repeating templates — never listed in the backlog. */
export function RepeatingPanel({ areas }: Props) {
  const repeating = seedRepeatingTasks();

  function startRepeatDrag(template: RepeatingTask, e: DragEvent) {
    e.dataTransfer.setData(REPEAT_DRAG_MIME, JSON.stringify(template));
    e.dataTransfer.setData("text/plain", template.title);
    e.dataTransfer.effectAllowed = "copy";
  }

  return (
    <section className="repeating-panel" aria-label="Repeating place sources">
      <div className="day-grid-meta">
        <h2>Repeating</h2>
        <p className="muted">
          Place onto the calendar only — not part of the backlog.
        </p>
      </div>
      <ul className="task-list repeating-list">
        {repeating.map((item) => {
          const area = areas.find((a) => a.id === item.areaId);
          return (
            <li
              key={item.id}
              className="task-row is-draggable repeating-row"
              draggable
              onDragStart={(e) => startRepeatDrag(item, e)}
            >
              <span
                className="swatch"
                style={{ background: area?.colour ?? "#666" }}
                aria-hidden
              />
              <div className="task-main">
                <strong>{item.title}</strong>
                <span className="muted">
                  {area?.name ?? item.areaId} · {item.durationMin}m
                  {item.deepWork ? " · deep" : ""}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
