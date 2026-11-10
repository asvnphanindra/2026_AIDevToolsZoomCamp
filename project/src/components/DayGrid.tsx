import { useMemo } from "react";
import type { SeedArea } from "@/data/fictional-seed";
import { buildDayGrid, itemPlacement } from "@/lib/day-grid";
import {
  buildHalfHourSlots,
  formatDayLabel,
  formatLastUpdated,
} from "@/lib/time";

type Props = {
  isDemo: boolean;
  areas: SeedArea[];
  timezone?: string;
};

/** US-B1 — today + next 2 days, 30-min rows, coloured items. */
export function DayGrid({ isDemo, areas, timezone }: Props) {
  const model = useMemo(
    () => buildDayGrid({ isDemo, areas, timezone }),
    [isDemo, areas, timezone],
  );
  const slots = useMemo(
    () => buildHalfHourSlots(model.startHour, model.endHour),
    [model.startHour, model.endHour],
  );

  return (
    <section className="day-grid" aria-label="Three-day hourly grid">
      <div className="day-grid-meta">
        <h2>Next 3 days</h2>
        <p className="muted">
          Last updated{" "}
          <time dateTime={model.updatedAt.toISOString()}>
            {formatLastUpdated(model.updatedAt, model.timezone)}
          </time>{" "}
          ({model.timezone})
        </p>
      </div>

      <div
        className="day-grid-board"
        style={{
          gridTemplateRows: `auto repeat(${slots.length}, minmax(1.35rem, auto))`,
        }}
      >
        <div className="day-grid-corner" aria-hidden />
        {model.dayKeys.map((key) => (
          <div
            key={key}
            className={
              key === model.todayKey
                ? "day-grid-head is-today"
                : "day-grid-head is-later"
            }
          >
            {key === model.todayKey ? "Today · " : null}
            {formatDayLabel(key, model.timezone)}
          </div>
        ))}

        {slots.map((slot, idx) => (
          <div
            key={slot}
            className="day-grid-time"
            style={{ gridRow: idx + 2 }}
          >
            {slot.endsWith(":00") ? slot : ""}
          </div>
        ))}

        {model.dayKeys.map((dayKey, dayIdx) => (
          <div
            key={`col-${dayKey}`}
            className={
              dayKey === model.todayKey
                ? "day-grid-col is-today"
                : "day-grid-col is-later"
            }
            style={{
              gridColumn: dayIdx + 2,
              gridRow: `2 / span ${slots.length}`,
            }}
          >
            {slots.map((slot) => (
              <div key={`${dayKey}-${slot}`} className="day-grid-slot" />
            ))}
            {model.items
              .filter((item) => item.date === dayKey)
              .map((item) => {
                const place = itemPlacement(
                  item,
                  model.startHour,
                  model.endHour,
                );
                if (!place) return null;
                return (
                  <article
                    key={item.id}
                    className={`day-grid-item kind-${item.kind}`}
                    style={{
                      top: `calc(${(place.rowStart - 2) * 1.35}rem)`,
                      height: `calc(${place.rowSpan * 1.35}rem - 2px)`,
                      background: item.colour,
                    }}
                    title={`${item.title} ${item.start}–${item.end}`}
                  >
                    <span className="day-grid-item-title">{item.title}</span>
                    <span className="day-grid-item-time">
                      {item.start}–{item.end}
                    </span>
                  </article>
                );
              })}
          </div>
        ))}
      </div>

      <ul className="day-grid-legend muted">
        <li>
          <span className="swatch" style={{ background: "#0F6B4C" }} /> Area
          block
        </li>
        <li>
          <span className="swatch" style={{ background: "#9AA29A" }} /> Routine
        </li>
        <li>
          <span className="swatch" style={{ background: "#C45C26" }} /> Fixed
          schedule
        </li>
      </ul>
    </section>
  );
}
