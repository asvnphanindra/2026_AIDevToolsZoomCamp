import { useMemo, useState, type FormEvent } from "react";
import {
  activeTimetable,
  coverageFor,
  mappingId,
  setCoverageAndCascade,
  type TeachingPlanState,
  type TimetableVersion,
} from "@/lib/teaching-plan";
import { dateKeyInTz, DEFAULT_TZ } from "@/lib/time";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Props = {
  plan: TeachingPlanState;
  onPlanChange: (next: TeachingPlanState) => void;
};

/** Job-area Teaching Plan: topics panel, coverage grid, semester, timetables. */
export function TeachingPlan({ plan, onPlanChange }: Props) {
  const [topicsOpen, setTopicsOpen] = useState(true);
  const [topicTitle, setTopicTitle] = useState("");
  const [ttName, setTtName] = useState("");
  const [ttFrom, setTtFrom] = useState(plan.semesterStart);
  const [ttTo, setTtTo] = useState(plan.semesterEnd);

  const today = dateKeyInTz(new Date(), DEFAULT_TZ);
  const active = useMemo(
    () =>
      activeTimetable(
        plan.timetables,
        today < plan.semesterStart ? plan.semesterStart : today,
        plan.semesterStart,
        plan.semesterEnd,
      ),
    [plan, today],
  );

  const topics = useMemo(
    () => [...plan.topics].sort((a, b) => a.order - b.order),
    [plan.topics],
  );
  const sections = useMemo(
    () => [...plan.sections].sort((a, b) => a.order - b.order),
    [plan.sections],
  );

  function patchPlan(partial: Partial<TeachingPlanState>) {
    onPlanChange({
      ...plan,
      ...partial,
      sectionIds: (partial.sections ?? plan.sections).map((s) => s.id),
    });
  }

  function onCoverageChange(
    topicId: string,
    sectionId: string,
    raw: string,
  ) {
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    onPlanChange(
      setCoverageAndCascade(plan, topicId, sectionId, n, today),
    );
  }

  function onAddTopic(event: FormEvent) {
    event.preventDefault();
    const title = topicTitle.trim();
    if (!title) return;
    const order =
      (topics.reduce((max, t) => Math.max(max, t.order), 0) || 0) + 1;
    const id = `topic-${Date.now().toString(36)}`;
    const mappings = [
      ...plan.mappings,
      ...sections.map((s) => ({
        id: mappingId(id, s.id),
        topicId: id,
        sectionId: s.id,
        coveragePercent: 0,
      })),
    ];
    patchPlan({
      topics: [...plan.topics, { id, title, order }],
      mappings,
    });
    setTopicTitle("");
  }

  function onAddTimetable(event: FormEvent) {
    event.preventDefault();
    const name = ttName.trim() || "Timetable";
    if (!ttFrom) return;
    const id = `tt-${Date.now().toString(36)}`;
    const version: TimetableVersion = {
      id,
      name,
      effectiveFrom: ttFrom,
      effectiveTo: ttTo || undefined,
      slots: active?.slots.map((s) => ({ ...s })) ?? [
        {
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "10:30",
          sectionId: sections[0]?.id ?? "sec-a",
        },
      ],
    };
    patchPlan({ timetables: [...plan.timetables, version] });
    setTtName("");
  }

  function mappingHint(topicId: string, sectionId: string): string {
    const m = plan.mappings.find(
      (row) => row.topicId === topicId && row.sectionId === sectionId,
    );
    if (!m?.plannedDate) return "";
    const day =
      m.plannedDayOfWeek != null ? DAY_LABELS[m.plannedDayOfWeek] : "";
    return `${m.plannedDate}${day ? ` · ${day}` : ""}`;
  }

  return (
    <section className="teaching-plan" aria-label="Teaching plan">
      <div className="teaching-plan-header">
        <div>
          <h3>Teaching Plan</h3>
          <p className="muted">
            Job topics × sections. Set coverage; at 100% the next topic picks
            up upcoming timetable slots.
          </p>
        </div>
        <div className="teaching-semester">
          <label>
            Semester start
            <input
              type="date"
              value={plan.semesterStart}
              onChange={(e) => patchPlan({ semesterStart: e.target.value })}
            />
          </label>
          <label>
            Semester end
            <input
              type="date"
              value={plan.semesterEnd}
              onChange={(e) => patchPlan({ semesterEnd: e.target.value })}
            />
          </label>
        </div>
      </div>

      <div className="teaching-plan-body">
        <aside
          className={
            topicsOpen
              ? "teaching-topics-panel is-open"
              : "teaching-topics-panel"
          }
        >
          <div className="teaching-topics-head">
            <strong>Topics</strong>
            <button
              type="button"
              className="secondary"
              aria-expanded={topicsOpen}
              onClick={() => setTopicsOpen((o) => !o)}
            >
              {topicsOpen ? "Hide" : "Show"}
            </button>
          </div>
          {topicsOpen ? (
            <>
              <ol className="teaching-topic-list">
                {topics.map((t) => (
                  <li key={t.id}>
                    <span className="teaching-topic-order">{t.order}</span>
                    <span>{t.title}</span>
                  </li>
                ))}
              </ol>
              <form className="teaching-topic-add" onSubmit={onAddTopic}>
                <label className="sr-only" htmlFor="tp-new-topic">
                  New topic
                </label>
                <input
                  id="tp-new-topic"
                  value={topicTitle}
                  onChange={(e) => setTopicTitle(e.target.value)}
                  placeholder="Add topic"
                  required
                />
                <button type="submit">Add</button>
              </form>
            </>
          ) : null}
        </aside>

        <div className="teaching-grid-wrap">
          <table className="teaching-coverage-grid">
            <thead>
              <tr>
                <th scope="col">Topic</th>
                {sections.map((s) => (
                  <th key={s.id} scope="col">
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topics.map((topic) => (
                <tr key={topic.id}>
                  <th scope="row">{topic.title}</th>
                  {sections.map((section) => {
                    const pct = coverageFor(
                      plan.mappings,
                      topic.id,
                      section.id,
                    );
                    const hint = mappingHint(topic.id, section.id);
                    return (
                      <td key={section.id}>
                        <label className="teaching-cell">
                          <span className="sr-only">
                            Coverage {topic.title} / {section.name}
                          </span>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={5}
                            value={pct}
                            onChange={(e) =>
                              onCoverageChange(
                                topic.id,
                                section.id,
                                e.target.value,
                              )
                            }
                          />
                          <span className="muted teaching-cell-pct">%</span>
                        </label>
                        {hint ? (
                          <span className="muted teaching-cell-hint">
                            {hint}
                          </span>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="teaching-timetables">
        <div className="teaching-timetables-head">
          <strong>Timetable versions</strong>
          <span className="muted">
            Active now:{" "}
            {active
              ? `${active.name} (${active.effectiveFrom}${
                  active.effectiveTo ? ` → ${active.effectiveTo}` : ""
                })`
              : "none in semester"}
          </span>
        </div>
        <ul className="teaching-tt-list">
          {plan.timetables.map((tt) => (
            <li key={tt.id}>
              <strong>{tt.name}</strong>
              <span className="muted">
                {tt.effectiveFrom}
                {tt.effectiveTo ? ` → ${tt.effectiveTo}` : " → …"} ·{" "}
                {tt.slots.length} slot{tt.slots.length === 1 ? "" : "s"}
              </span>
              <ul className="teaching-tt-slots">
                {tt.slots.map((slot, i) => (
                  <li key={`${tt.id}-${i}`}>
                    {DAY_LABELS[slot.dayOfWeek] ?? slot.dayOfWeek}{" "}
                    {slot.startTime}–{slot.endTime} ·{" "}
                    {sections.find((s) => s.id === slot.sectionId)?.name ??
                      slot.sectionId}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        <form className="teaching-tt-add" onSubmit={onAddTimetable}>
          <label>
            Name
            <input
              value={ttName}
              onChange={(e) => setTtName(e.target.value)}
              placeholder="e.g. Mid-semester"
            />
          </label>
          <label>
            From
            <input
              type="date"
              value={ttFrom}
              onChange={(e) => setTtFrom(e.target.value)}
              required
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={ttTo}
              onChange={(e) => setTtTo(e.target.value)}
            />
          </label>
          <button type="submit">Add version</button>
        </form>
      </div>
    </section>
  );
}
