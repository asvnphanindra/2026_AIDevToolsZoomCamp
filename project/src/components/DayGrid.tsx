import {
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";
import {
  DAY_TYPE_LABELS,
  fictionalSeed,
  type DayTypeKind,
  type ScheduleChangeKind,
  type SeedArea,
  type SeedDayType,
  type SeedScheduleChange,
} from "@/data/fictional-seed";
import {
  bandColour,
  buildDayGrid,
  itemPlacement,
  slotBandLevel,
} from "@/lib/day-grid";
import {
  dayTypeForOffset,
  defaultLabelFor,
  findOverlappingSchedule,
  mergeDayTypes,
  mergeScheduleChanges,
} from "@/lib/schedule";
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
const ROW_PX = 1.35;
const STORAGE_KEY = "work-planner.day-type-overrides";
const CHANGES_KEY = "work-planner.schedule-changes";

const DAY_TYPE_OPTIONS: DayTypeKind[] = [
  "normal",
  "holiday",
  "no-fixed-schedule",
  "online",
  "exam",
];

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Week grid + US-B4 day types + US-B5 one-off schedule changes. */
export function DayGrid({ isDemo, areas, timezone }: Props) {
  const [overrides, setOverrides] = useState<SeedDayType[]>(() =>
    typeof localStorage === "undefined"
      ? []
      : readJson<SeedDayType[]>(STORAGE_KEY, []),
  );
  const [extraChanges, setExtraChanges] = useState<SeedScheduleChange[]>(() =>
    typeof localStorage === "undefined"
      ? []
      : readJson<SeedScheduleChange[]>(CHANGES_KEY, []),
  );
  const [form, setForm] = useState({
    dayOffset: 0,
    kind: "extra" as ScheduleChangeKind,
    title: "",
    start: "10:00",
    end: "10:30",
  });

  const dayTypes = useMemo(
    () => mergeDayTypes(fictionalSeed.dayTypes, overrides),
    [overrides],
  );
  const scheduleChanges = useMemo(
    () =>
      mergeScheduleChanges(
        fictionalSeed.scheduleChanges ?? [],
        extraChanges,
      ),
    [extraChanges],
  );

  const model = useMemo(
    () =>
      buildDayGrid({
        isDemo,
        areas,
        timezone,
        dayTypes,
        scheduleChanges,
      }),
    [isDemo, areas, timezone, dayTypes, scheduleChanges],
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

  function applyDayType(relativeOffset: number, type: DayTypeKind) {
    const seedHit = fictionalSeed.dayTypes.find(
      (d) => d.dayOffset === relativeOffset,
    );
    setOverrides((prev) => {
      const without = prev.filter((d) => d.dayOffset !== relativeOffset);
      const entry: SeedDayType = {
        dayOffset: relativeOffset,
        type,
        label: defaultLabelFor(type),
        ...(type === "online"
          ? { onlineSlots: seedHit?.onlineSlots ?? [] }
          : {}),
      };
      const nextList = [...without, entry];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextList));
      return nextList;
    });
  }

  function submitOneOff(event: FormEvent) {
    event.preventDefault();
    const title = form.title.trim();
    if (!title) return;
    const date = model.dayKeys[model.todayIndex + form.dayOffset];
    if (!date) return;

    let kind = form.kind;
    if (kind !== "cancel") {
      const overlaps = findOverlappingSchedule(
        model.items,
        date,
        form.start,
        form.end,
      );
      if (overlaps.length) {
        const names = overlaps.map((o) => `${o.title} ${o.start}–${o.end}`).join("; ");
        const replace = window.confirm(
          `Overlaps: ${names}\n\nOK = replace (substitute)\nCancel = add as extra`,
        );
        kind = replace ? "substitute" : "extra";
      }
    }

    const entry: SeedScheduleChange = {
      id: `user-${Date.now()}`,
      dayOffset: form.dayOffset,
      kind,
      title,
      start: form.start,
      end: form.end,
    };
    setExtraChanges((prev) => {
      const next = [...prev, entry];
      localStorage.setItem(CHANGES_KEY, JSON.stringify(next));
      return next;
    });
    setForm((f) => ({ ...f, title: "" }));
  }

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
    const topPx =
      ((mins - windowStart) / (windowEnd - windowStart)) * rect.height;
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
          ({model.timezone}) · mark day types in each header · hover for
          15-min marks ({HOVER_MARK_START}–{HOVER_MARK_END})
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

      <form className="one-off-form" onSubmit={submitOneOff}>
        <h3>One-off schedule change</h3>
        <div className="one-off-row">
          <label>
            Day
            <select
              value={form.dayOffset}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  dayOffset: Number(e.target.value),
                }))
              }
            >
              {model.dayKeys.map((key, idx) => {
                const rel = idx - model.todayIndex;
                return (
                  <option key={key} value={rel}>
                    {rel === 0 ? "Today · " : ""}
                    {formatDayLabel(key, model.timezone)}
                  </option>
                );
              })}
            </select>
          </label>
          <label>
            Kind
            <select
              value={form.kind}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  kind: e.target.value as ScheduleChangeKind,
                }))
              }
            >
              <option value="extra">Extra</option>
              <option value="substitute">Substitute</option>
              <option value="cancel">Cancel</option>
            </select>
          </label>
          <label>
            Title
            <input
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              placeholder="Session title"
              required
            />
          </label>
          <label>
            Start
            <input
              type="time"
              value={form.start}
              onChange={(e) =>
                setForm((f) => ({ ...f, start: e.target.value }))
              }
              required
            />
          </label>
          <label>
            End
            <input
              type="time"
              value={form.end}
              onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))}
              required
            />
          </label>
          <button type="submit">Apply</button>
        </div>
        <p className="muted hint-inline">
          Overlap prompts replace vs extra. Cancel removes overlapping fixed
          items that day only. Seed demos: doctor (extra), cancel −2, cover
          (sub).
        </p>
      </form>

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
          const dt = dayTypeForOffset(relative, model.dayTypes);
          const currentType: DayTypeKind = dt?.type ?? "normal";
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
              <div className="day-grid-head-title">
                {isToday ? "Today · " : null}
                {formatDayLabel(key, model.timezone)}
              </div>
              <label className="day-type-picker">
                <span className="sr-only">Day type</span>
                <select
                  value={currentType}
                  onChange={(e) =>
                    applyDayType(relative, e.target.value as DayTypeKind)
                  }
                  aria-label={`Day type for ${formatDayLabel(key, model.timezone)}`}
                >
                  {DAY_TYPE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {DAY_TYPE_LABELS[opt]}
                    </option>
                  ))}
                </select>
              </label>
              {dt && dt.type !== "normal" ? (
                <span className="day-type-tag">{dt.label}</span>
              ) : null}
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
        </li>
        <li>
          <span className="swatch" style={{ background: "#9B9B9B" }} /> Fixed
          (online grey)
        </li>
        <li>
          <span className="swatch" style={{ background: "#5B7C99" }} /> Online
          slot
        </li>
        <li>
          <span className="swatch" style={{ background: "#8B4513" }} /> One-off
        </li>
      </ul>
    </section>
  );
}
