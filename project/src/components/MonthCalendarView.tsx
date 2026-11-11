import { useMemo } from "react";
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
import { dateKeyInTz, formatDayLabel } from "@/lib/time";

type Props = {
  events: CalendarEvent[];
  timezone?: string;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const KINDS = Object.keys(EVENT_KIND_LABELS) as CalendarEventKind[];

/** 3-month mini calendar + upcoming list (US-F1). */
export function MonthCalendarView({
  events,
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

  return (
    <section className="month-calendar-view" aria-label="3-month calendar">
      <div className="day-grid-meta">
        <h2>Calendar</h2>
        <p className="muted">
          This month and the next two · coloured markers by event kind ·
          current ISO week highlighted · upcoming list below
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
                            ? dayEvents.map((e) => e.label).join(", ")
                            : undefined
                        }
                      >
                        <span className="month-day-num">{dayNum}</span>
                        {dayEvents.length ? (
                          <span className="month-day-markers" aria-label={`${dayEvents.length} events`}>
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
