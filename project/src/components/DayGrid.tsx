import { useMemo, useRef, useState, type MouseEvent } from "react";
import type { SeedArea } from "@/data/fictional-seed";
import {
  bandColour,
  buildDayGrid,
  itemPlacement,
  slotBandLevel,
} from "@/lib/day-grid";
import { dayTypeForOffset } from "@/lib/schedule";
import {
  buildHalfHourSlots,
  formatDayLabel,
  formatHhmm,
  formatLastUpdated,
  minutesOf,
  weekdaySun0,
} from "@/lib/time";

type Props = {
  isDemo: boolean;
  areas: SeedArea[];
  timezone?: string;
};

const HOVER_MARK_START = "05:00";
const HOVER_MARK_END = "22:00";
const ROW_PX = 1.35; // rem — keep in sync with CSS

/** Week grid (today−3…today+3) + energy strip + 15-min hover markers. */
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
  const stripWeekday = weekdaySun0(model.todayKey, model.timezone);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ topPx: number; label: string } | null>(
    null,
  );

  function onBodyMove(event: MouseEvent<HTMLDivElement>) {
    const el = bodyRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const y = event.clientY - rect.top;
    if (y < 0 || y > rect.height) {
      setHover(null);
      return;
    }
    const windowStart = model.startHour * 60;
    const windowEnd = model.endHour * 60;
    const markStart = minutesOf(HOVER_MARK_START);
    const markEnd = minutesOf(HOVER_MARK_END);
    const ratio = y / rect.height;
    let mins = windowStart + ratio * (windowEnd - windowStart);
    mins = Math.round(mins / 15) * 15;
    mins = Math.min(Math.max(mins, markStart), markEnd);
    mins = Math.min(Math.max(mins, windowStart), windowEnd);
    const topPx = ((mins - windowStart) / (windowEnd - windowStart)) * rect.height;
    setHover({ topPx, label: formatHhmm(mins) });
  }

  return (
    <section className="day-grid" aria-label="Seven-day hourly grid">
      <div className="day-grid-meta">
        <h2>This week</h2>
        <p className="muted">
          Last updated{" "}
          <time dateTime={model.updatedAt.toISOString()}>
            {formatLastUpdated(model.updatedAt, model.timezone)}
          </time>{" "}
          ({model.timezone}) · {model.scheduleFromSeed} fixed seed items ·
          hover for 15-min marks ({HOVER_MARK_START}–{HOVER_MARK_END})
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
        className="day-grid-board has-energy week-7"
        style={{
          gridTemplateRows: `auto repeat(${slots.length}, minmax(${ROW_PX}rem, auto))`,
        }}
      >
        <div className="day-grid-corner" aria-hidden />
        <div className="day-grid-energy-head" title="Energy">
          E
        </div>
        {model.dayKeys.map((key, dayIdx) => {
          const relative = dayIdx - model.todayIndex;
          const isPast = relative < 0;
          const isToday = relative === 0;
          return (
            <div
              key={key}
              className={
                isToday
                  ? "day-grid-head is-today"
                  : isPast
                    ? "day-grid-head is-past"
                    : "day-grid-head is-future"
              }
              style={{ gridColumn: dayIdx + 3, gridRow: 1 }}
            >
              {isToday ? "Today · " : null}
              {formatDayLabel(key, model.timezone)}
              {(() => {
                const dt = dayTypeForOffset(relative, model.dayTypes);
                return dt ? (
                  <span className="day-type-tag"> · {dt.label}</span>
                ) : null;
              })()}
            </div>
          );
        })}

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

        <div
          ref={bodyRef}
          className="day-grid-body"
          style={{
            gridColumn: `3 / span ${model.dayKeys.length}`,
            gridRow: `2 / span ${slots.length}`,
          }}
          onMouseMove={onBodyMove}
          onMouseLeave={() => setHover(null)}
        >
          {model.dayKeys.map((dayKey, dayIdx) => {
            const relative = dayIdx - model.todayIndex;
            const isPast = relative < 0;
            const isToday = relative === 0;
            return (
              <div
                key={`col-${dayKey}`}
                className={
                  isToday
                    ? "day-grid-col is-today"
                    : isPast
                      ? "day-grid-col is-past"
                      : "day-grid-col is-future"
                }
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
                          top: `calc(${(place.rowStart - 2) * ROW_PX}rem)`,
                          height: `calc(${place.rowSpan * ROW_PX}rem - 2px)`,
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
            );
          })}

          {hover ? (
            <div
              className="day-grid-hover-guide"
              style={{ top: hover.topPx }}
              aria-hidden
            >
              <span className="day-grid-hover-label">{hover.label}</span>
            </div>
          ) : null}
        </div>
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
