import {
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { BottomSheet } from "@/components/BottomSheet";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import type { CalendarEventKind } from "@/data/fictional-seed";
import {
  currentWeekDayKeys,
  EVENT_KIND_COLOURS,
  EVENT_KIND_LABELS,
  eventsOnDate,
  threeMonthGrids,
  upcomingEvents,
  type CalendarEvent,
  type MonthGrid,
} from "@/lib/calendar-events";
import {
  describeSeriesRule,
  expandSeriesOccurrences,
  type CalendarSeries,
  type SeriesRule,
} from "@/lib/calendar-series";
import { dateKeyInTz, formatDayLabel } from "@/lib/time";

type Props = {
  events: CalendarEvent[];
  series: CalendarSeries[];
  onSeriesChange: (next: CalendarSeries[]) => void;
  timezone?: string;
  onOpenDay?: (dateKey: string) => void;
  onAddItem?: (dateKey: string) => void;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const KINDS = Object.keys(EVENT_KIND_LABELS) as CalendarEventKind[];
const SWIPE_MIN = 48;

/** 3-month mini calendar + upcoming list + recurring series rules (US-F1/F2). */
export function MonthCalendarView({
  events,
  series,
  onSeriesChange,
  timezone = "Asia/Kolkata",
  onOpenDay,
  onAddItem,
}: Props) {
  const bp = useBreakpoint();
  const isPhone = bp === "phone";
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const swipeRef = useRef<{ x: number; y: number; id: number } | null>(null);

  const monthAnchor = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);

  const grids = useMemo((): MonthGrid[] => {
    if (isPhone) {
      return [threeMonthGrids(monthAnchor, timezone)[0]!];
    }
    return threeMonthGrids(new Date(), timezone);
  }, [isPhone, monthAnchor, timezone]);

  const weekKeys = useMemo(
    () => new Set(currentWeekDayKeys(new Date(), timezone)),
    [timezone],
  );
  const todayKey = dateKeyInTz(new Date(), timezone);
  const upcoming = useMemo(
    () => upcomingEvents(events, new Date(), timezone),
    [events, timezone],
  );

  const selectedEvents = useMemo(
    () => (selectedDate ? eventsOnDate(events, selectedDate) : []),
    [events, selectedDate],
  );
  const selectedSeriesHits = useMemo(() => {
    if (!selectedDate) return [];
    return series.flatMap((s) =>
      expandSeriesOccurrences(s, selectedDate, selectedDate),
    );
  }, [series, selectedDate]);

  const [label, setLabel] = useState("");
  const [time, setTime] = useState("19:00");
  const [freq, setFreq] = useState<"weeks" | "months">("weeks");
  const [interval, setInterval] = useState(3);
  const [dayOfMonth, setDayOfMonth] = useState(24);
  const [startDate, setStartDate] = useState(todayKey);

  function togglePaused(id: string) {
    onSeriesChange(
      series.map((s) => (s.id === id ? { ...s, paused: !s.paused } : s)),
    );
  }

  function onAddSeries(e: FormEvent) {
    e.preventDefault();
    const trimmed = label.trim();
    if (!trimmed) return;
    const n = Math.max(1, Math.floor(interval) || 1);
    const rule: SeriesRule =
      freq === "weeks"
        ? { freq: "weeks", interval: n }
        : {
            freq: "months",
            interval: n,
            dayOfMonth: Math.min(31, Math.max(1, Math.floor(dayOfMonth) || 1)),
          };
    const next: CalendarSeries = {
      id: `ser-${Date.now()}`,
      label: trimmed,
      kind: "series",
      rule,
      startDate: startDate || todayKey,
      paused: false,
      time: time.trim() || undefined,
    };
    onSeriesChange([...series, next]);
    setLabel("");
  }

  function onSelectDate(dateKey: string) {
    setSelectedDate(dateKey);
  }

  function onSwipeDown(e: ReactPointerEvent) {
    if (!isPhone) return;
    swipeRef.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
  }

  function onSwipeUp(e: ReactPointerEvent) {
    if (!isPhone) return;
    const start = swipeRef.current;
    swipeRef.current = null;
    if (!start || start.id !== e.pointerId) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < Math.abs(dy)) return;
    setMonthOffset((o) => o + (dx < 0 ? 1 : -1));
  }

  return (
    <section className="month-calendar-view" aria-label="3-month calendar">
      <div className="day-grid-meta">
        <h2>Calendar</h2>
        <p className="muted">
          {isPhone
            ? "Swipe months · tap a date for the day sheet"
            : "This month and the next two · tap a date for the day sheet · series expanded on read"}
        </p>
      </div>

      <ul className="cal-legend" aria-label="Event kind colours">
        {KINDS.map((kind) => (
          <li key={kind}>
            <span
              className="cal-dot"
              style={{ background: EVENT_KIND_COLOURS[kind] }}
              aria-hidden
            />
            {EVENT_KIND_LABELS[kind]}
          </li>
        ))}
      </ul>

      {isPhone ? (
        <div className="month-nav">
          <button
            type="button"
            className="secondary tap-target"
            onClick={() => setMonthOffset((o) => o - 1)}
          >
            Prev
          </button>
          <button
            type="button"
            className="secondary tap-target"
            onClick={() => setMonthOffset(0)}
          >
            This month
          </button>
          <button
            type="button"
            className="tap-target"
            onClick={() => setMonthOffset((o) => o + 1)}
          >
            Next
          </button>
        </div>
      ) : null}

      <div
        className={
          isPhone
            ? "month-calendar-grid month-calendar-grid-phone"
            : "month-calendar-grid"
        }
        onPointerDown={onSwipeDown}
        onPointerUp={onSwipeUp}
        onPointerCancel={() => {
          swipeRef.current = null;
        }}
      >
        {grids.map((month) => (
          <article key={month.key} className="month-panel">
            <h3>{month.label}</h3>
            <div className="month-weekdays" aria-hidden>
              {WEEKDAYS.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="month-weeks" role="grid" aria-label={month.label}>
              {month.weeks.map((week, wi) => (
                <div key={`${month.key}-w${wi}`} className="month-week" role="row">
                  {week.map((dayKey, di) => {
                    if (!dayKey) {
                      return (
                        <div
                          key={`${month.key}-pad-${wi}-${di}`}
                          className="month-day month-day-pad"
                          role="gridcell"
                        />
                      );
                    }
                    const dayEvents = eventsOnDate(events, dayKey);
                    const inWeek = weekKeys.has(dayKey);
                    const isToday = dayKey === todayKey;
                    const dayNum = Number(dayKey.slice(-2));
                    return (
                      <button
                        key={dayKey}
                        type="button"
                        role="gridcell"
                        className={[
                          "month-day",
                          "month-day-btn",
                          "tap-target",
                          inWeek ? "month-day-week" : "",
                          isToday ? "month-day-today" : "",
                          selectedDate === dayKey ? "month-day-selected" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        title={
                          dayEvents.length
                            ? dayEvents.map((ev) => ev.label).join(", ")
                            : `Open ${dayKey}`
                        }
                        onClick={() => onSelectDate(dayKey)}
                      >
                        <span className="month-day-num">{dayNum}</span>
                        {dayEvents.length ? (
                          <span
                            className="month-day-markers"
                            aria-label={`${dayEvents.length} events`}
                          >
                            {uniqueKinds(dayEvents).map((kind) => (
                              <span
                                key={kind}
                                className="cal-dot"
                                style={{
                                  background: EVENT_KIND_COLOURS[kind],
                                }}
                              />
                            ))}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>

      <BottomSheet
        open={Boolean(selectedDate)}
        title={
          selectedDate
            ? formatDayLabel(selectedDate, timezone)
            : "Day"
        }
        onClose={() => setSelectedDate(null)}
        footer={
          selectedDate ? (
            <div className="sheet-actions sheet-actions-row">
              <button
                type="button"
                className="tap-target"
                onClick={() => {
                  const key = selectedDate;
                  setSelectedDate(null);
                  onOpenDay?.(key);
                }}
              >
                Open day
              </button>
              <button
                type="button"
                className="secondary tap-target"
                onClick={() => {
                  const key = selectedDate;
                  setSelectedDate(null);
                  onAddItem?.(key);
                }}
              >
                Add item
              </button>
            </div>
          ) : null
        }
      >
        {selectedDate ? (
          <>
            <p className="muted">{selectedDate}</p>
            {selectedEvents.length === 0 && selectedSeriesHits.length === 0 ? (
              <p className="muted">Nothing on this date.</p>
            ) : (
              <ul className="cal-day-sheet-list">
                {selectedEvents.map((event) => (
                  <li key={event.id} className="cal-upcoming-item">
                    <span
                      className="cal-dot"
                      style={{ background: EVENT_KIND_COLOURS[event.kind] }}
                      aria-hidden
                    />
                    <div className="task-main">
                      <strong>{event.label}</strong>
                      <span className="muted">
                        {event.time ? `${event.time} · ` : ""}
                        {EVENT_KIND_LABELS[event.kind]}
                        {event.seriesId ? " · from series" : ""}
                      </span>
                    </div>
                  </li>
                ))}
                {selectedSeriesHits
                  .filter((hit) => !selectedEvents.some((e) => e.id === hit.id))
                  .map((hit) => (
                    <li key={hit.id} className="cal-upcoming-item">
                      <span
                        className="cal-dot"
                        style={{ background: EVENT_KIND_COLOURS[hit.kind] }}
                        aria-hidden
                      />
                      <div className="task-main">
                        <strong>{hit.label}</strong>
                        <span className="muted">
                          {hit.time ? `${hit.time} · ` : ""}
                          series
                        </span>
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </>
        ) : null}
      </BottomSheet>

      <section className="cal-series" aria-label="Recurring series">
        <h3>Recurring series</h3>
        <p className="muted">
          Rules only are stored; occurrences expand when the Calendar is read.
        </p>
        {series.length === 0 ? (
          <p className="muted">No series yet.</p>
        ) : (
          <ul className="cal-series-list">
            {series.map((s) => (
              <li key={s.id} className="cal-series-item">
                <span
                  className="cal-dot"
                  style={{ background: EVENT_KIND_COLOURS[s.kind] }}
                  aria-hidden
                />
                <div className="task-main">
                  <strong>
                    {s.label}
                    {s.paused ? " (paused)" : ""}
                  </strong>
                  <span className="muted">
                    {describeSeriesRule(s.rule)}
                    {s.time ? ` · ${s.time}` : ""}
                    {" · from "}
                    {s.startDate}
                  </span>
                </div>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => togglePaused(s.id)}
                >
                  {s.paused ? "Resume" : "Pause"}
                </button>
              </li>
            ))}
          </ul>
        )}

        <form className="cal-series-form" onSubmit={onAddSeries}>
          <label>
            Label
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Study cohort"
              required
            />
          </label>
          <label>
            Start date
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </label>
          <label>
            Time
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </label>
          <label>
            Repeat
            <select
              value={freq}
              onChange={(e) =>
                setFreq(e.target.value === "months" ? "months" : "weeks")
              }
            >
              <option value="weeks">Every N weeks</option>
              <option value="months">Every N months on day</option>
            </select>
          </label>
          <label>
            N
            <input
              type="number"
              min={1}
              max={52}
              value={interval}
              onChange={(e) => setInterval(Number(e.target.value))}
            />
          </label>
          {freq === "months" ? (
            <label>
              Day of month
              <input
                type="number"
                min={1}
                max={31}
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(Number(e.target.value))}
              />
            </label>
          ) : null}
          <button type="submit">Add series</button>
        </form>
      </section>

      <section className="cal-upcoming" aria-label="Upcoming events">
        <h3>Upcoming</h3>
        {upcoming.length === 0 ? (
          <p className="muted">No upcoming events in the seed window.</p>
        ) : (
          <ul className="cal-upcoming-list">
            {upcoming.map((event) => (
              <li key={event.id} className="cal-upcoming-item">
                <span
                  className="cal-dot"
                  style={{ background: EVENT_KIND_COLOURS[event.kind] }}
                  aria-hidden
                />
                <div className="task-main">
                  <strong>{event.label}</strong>
                  <span className="muted">
                    {formatDayLabel(event.date, timezone)}
                    {event.time ? ` · ${event.time}` : ""}
                    {" · "}
                    {EVENT_KIND_LABELS[event.kind]}
                    {event.seriesId ? " · from series" : ""}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}

function uniqueKinds(events: CalendarEvent[]): CalendarEventKind[] {
  const seen = new Set<CalendarEventKind>();
  const out: CalendarEventKind[] = [];
  for (const e of events) {
    if (seen.has(e.kind)) continue;
    seen.add(e.kind);
    out.push(e.kind);
  }
  return out;
}
