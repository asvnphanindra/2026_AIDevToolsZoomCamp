import { useMemo, useState, type FormEvent } from "react";
import type { CalendarEventKind } from "@/data/fictional-seed";
import {
  currentWeekDayKeys,
  EVENT_KIND_COLOURS,
  EVENT_KIND_LABELS,
  eventsOnDate,
  threeMonthGrids,
  upcomingEvents,
  type CalendarEvent,
} from "@/lib/calendar-events";
import {
  describeSeriesRule,
  type CalendarSeries,
  type SeriesRule,
} from "@/lib/calendar-series";
import { dateKeyInTz, formatDayLabel } from "@/lib/time";

type Props = {
  events: CalendarEvent[];
  series: CalendarSeries[];
  onSeriesChange: (next: CalendarSeries[]) => void;
  timezone?: string;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const KINDS = Object.keys(EVENT_KIND_LABELS) as CalendarEventKind[];

/** 3-month mini calendar + upcoming list + recurring series rules (US-F1/F2). */
export function MonthCalendarView({
  events,
  series,
  onSeriesChange,
  timezone = "Asia/Kolkata",
}: Props) {
  const grids = useMemo(
    () => threeMonthGrids(new Date(), timezone),
    [timezone],
  );
  const weekKeys = useMemo(
    () => new Set(currentWeekDayKeys(new Date(), timezone)),
    [timezone],
  );
  const todayKey = dateKeyInTz(new Date(), timezone);
  const upcoming = useMemo(
    () => upcomingEvents(events, new Date(), timezone),
    [events, timezone],
  );

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

  return (
    <section className="month-calendar-view" aria-label="3-month calendar">
      <div className="day-grid-meta">
        <h2>Calendar</h2>
        <p className="muted">
          This month and the next two · coloured markers by event kind ·
          current ISO week highlighted · series expanded on read · upcoming
          list below
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

      <div className="month-calendar-grid">
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
                      <div
                        key={dayKey}
                        role="gridcell"
                        className={[
                          "month-day",
                          inWeek ? "month-day-week" : "",
                          isToday ? "month-day-today" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        title={
                          dayEvents.length
                            ? dayEvents.map((ev) => ev.label).join(", ")
                            : undefined
                        }
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
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>

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
