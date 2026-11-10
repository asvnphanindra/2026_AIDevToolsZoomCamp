import { useMemo } from "react";
import type { SeedArea } from "@/data/fictional-seed";
import {
  bandColour,
  buildDayGrid,
  itemPlacement,
  slotBandLevel,
} from "@/lib/day-grid";
import {
  buildHalfHourSlots,
  formatDayLabel,
  formatLastUpdated,
  weekdaySun0,
} from "@/lib/time";

type Props = {
  isDemo: boolean;
  areas: SeedArea[];
  timezone?: string;
};

/** US-B1 grid + US-B2 energy strip and deep-work warnings. */
export function DayGrid({ isDemo, areas, timezone }: Props) {
  const model = useMemo(
    () => buildDayGrid({ isDemo, areas, timezone }),
    [isDemo, areas, timezone],
  );
  const slots = useMemo(
    () => buildHalfHourSlots(model.startHour, model.endHour),
    [model.startHour, model.endHour],
  );
  const warnIds = useMemo(
    () => new Set(model.warnings.map((w) => w.blockId)),
    [model.warnings],
  );
  // Strip uses today's weekday pattern (bands are time-of-day).
  const stripWeekday = weekdaySun0(model.todayKey, model.timezone);

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

      {model.warnings.length > 0 ? (
        <div className="energy-warn" role="status">
          Deep work in a low-energy band:{" "}
          {model.warnings
            .map((w) => `${w.title} (${w.start}–${w.end})`)
            .join("; ")}
          .
        </div>
      ) : null}

      <div
        className="day-grid-board has-energy"
        style={{
          gridTemplateRows: `auto repeat(${slots.length}, minmax(1.35rem, auto))`,
        }}
      >
        <div className="day-grid-corner" aria-hidden />
        <div className="day-grid-energy-head" title="Energy">
          E
        </div>
        {model.dayKeys.map((key, dayIdx) => (
          <div
            key={key}
            className={
              key === model.todayKey
                ? "day-grid-head is-today"
                : "day-grid-head is-later"
            }
            style={{ gridColumn: dayIdx + 3, gridRow: 1 }}
          >
            {key === model.todayKey ? "Today · " : null}
            {formatDayLabel(key, model.timezone)}
          </div>
        ))}

        {slots.map((slot, idx) => (
          <div
            key={slot}
            className="day-grid-time"
            style={{ gridColumn: 1, gridRow: idx + 2 }}
          >
            {slot.endsWith(":00") ? slot : ""}
          </div>
        ))}

        <div
          className="day-grid-energy"
          style={{ gridRow: `2 / span ${slots.length}` }}
          aria-label="Energy bands"
        >
          {slots.map((slot) => {
            const level = slotBandLevel(slot, model.bands, stripWeekday);
            return (
              <div
                key={`e-${slot}`}
                className="day-grid-energy-slot"
                style={{
                  background: level ? bandColour(level) : "transparent",
                }}
                title={level ? `${slot} · ${level}` : slot}
              />
            );
          })}
        </div>

        {model.dayKeys.map((dayKey, dayIdx) => (
          <div
            key={`col-${dayKey}`}
            className={
              dayKey === model.todayKey
                ? "day-grid-col is-today"
                : "day-grid-col is-later"
            }
            style={{
              gridColumn: dayIdx + 3,
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
                const warned = warnIds.has(item.id);
                return (
                  <article
                    key={item.id}
                    className={`day-grid-item kind-${item.kind}${warned ? " is-warn" : ""}`}
                    style={{
                      top: `calc(${(place.rowStart - 2) * 1.35}rem)`,
                      height: `calc(${place.rowSpan * 1.35}rem - 2px)`,
                      background: item.colour,
                    }}
                    title={`${item.title} ${item.start}–${item.end}${warned ? " · deep work in low band" : ""}`}
                  >
                    <span className="day-grid-item-title">
                      {warned ? "! " : ""}
                      {item.title}
                    </span>
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
          <span className="swatch" style={{ background: "#7BC47F" }} /> High
        </li>
        <li>
          <span className="swatch" style={{ background: "#E0C36A" }} /> Medium
        </li>
        <li>
          <span className="swatch" style={{ background: "#C98B8B" }} /> Low
        </li>
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
