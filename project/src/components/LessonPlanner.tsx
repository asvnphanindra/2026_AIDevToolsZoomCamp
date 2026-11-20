import {
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
  type MouseEvent,
} from "react";
import { dateKeyInTz, DEFAULT_TZ } from "@/lib/time";
import {
  clampCoverage,
  clampToSemester,
  expandSlotOccurrences,
  parseTopicsPaste,
  placementId,
  shiftWeekPeriod,
  TLP_TOPIC_DRAG_MIME,
  weekDayKeys,
  weekPeriodForDate,
  type SlotKind,
  type TlpOccurrence,
  type TlpPlan,
  type TlpPlacement,
  type TlpSlot,
  type TlpSubject,
  type TlpTimetable,
} from "@/lib/tlp";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Screen = "setup" | "schedule" | "topics" | "map";

type Props = {
  plan: TlpPlan;
  onPlanChange: (next: TlpPlan) => void;
};

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/** Standalone Teaching Lesson Planner (`/tlp`). Job TeachingPlan.tsx untouched. */
export function LessonPlanner({ plan, onPlanChange }: Props) {
  const [screen, setScreen] = useState<Screen>("setup");
  const [pasteText, setPasteText] = useState("");
  const today = dateKeyInTz(new Date(), DEFAULT_TZ);
  const [weekPeriod, setWeekPeriod] = useState(() =>
    weekPeriodForDate(
      clampToSemester(today, plan.semesterStart || today, plan.semesterEnd || today),
    ),
  );

  const sections = useMemo(
    () => [...plan.sections].sort((a, b) => a.order - b.order),
    [plan.sections],
  );
  const subjects = useMemo(
    () => [...plan.subjects].sort((a, b) => a.order - b.order),
    [plan.subjects],
  );
  const topics = useMemo(
    () => [...plan.topics].sort((a, b) => a.order - b.order),
    [plan.topics],
  );

  const occurrences = useMemo(() => expandSlotOccurrences(plan), [plan]);
  const weekKeys = useMemo(() => weekDayKeys(weekPeriod), [weekPeriod]);
  const todayInWeek = weekKeys.includes(today);
  const subjectName = (id: string) =>
    subjects.find((s) => s.id === id)?.name ?? id;

  function patch(partial: Partial<TlpPlan>) {
    onPlanChange({ ...plan, ...partial });
  }

  function jumpToToday() {
    const clamped = clampToSemester(
      today,
      plan.semesterStart || today,
      plan.semesterEnd || today,
    );
    setWeekPeriod(weekPeriodForDate(clamped));
  }

  function onAddSubject(event: FormEvent) {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const input = form.elements.namedItem("subjectName") as HTMLInputElement;
    const name = input.value.trim();
    if (!name) return;
    const order =
      (subjects.reduce((max, s) => Math.max(max, s.order), 0) || 0) + 1;
    const next: TlpSubject = { id: newId("sub"), name, order };
    patch({ subjects: [...plan.subjects, next] });
    input.value = "";
  }

  function onAddTimetable(event: FormEvent) {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const name = (
      form.elements.namedItem("ttName") as HTMLInputElement
    ).value.trim();
    const from = (form.elements.namedItem("ttFrom") as HTMLInputElement).value;
    const to = (form.elements.namedItem("ttTo") as HTMLInputElement).value;
    if (!name || !from) return;
    const tt: TlpTimetable = {
      id: newId("tt"),
      name,
      effectiveFrom: from,
      effectiveTo: to || undefined,
      slots: [],
    };
    patch({ timetables: [...plan.timetables, tt] });
    form.reset();
  }

  function onAddSlot(ttId: string, event: FormEvent) {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const dayOfWeek = Number(
      (form.elements.namedItem("day") as HTMLSelectElement).value,
    );
    const startTime = (form.elements.namedItem("start") as HTMLInputElement)
      .value;
    const endTime = (form.elements.namedItem("end") as HTMLInputElement).value;
    const sectionId = (form.elements.namedItem("section") as HTMLSelectElement)
      .value;
    const subjectId = (form.elements.namedItem("subject") as HTMLSelectElement)
      .value;
    const kind = ((form.elements.namedItem("kind") as HTMLSelectElement)
      .value || "class") as SlotKind;
    if (!startTime || !endTime || !sectionId || !subjectId) return;
    const slot: TlpSlot = {
      id: newId("slot"),
      dayOfWeek,
      startTime,
      endTime,
      sectionId,
      subjectId,
      kind,
    };
    patch({
      timetables: plan.timetables.map((t) =>
        t.id === ttId ? { ...t, slots: [...t.slots, slot] } : t,
      ),
    });
    form.reset();
  }

  function applyPaste() {
    const titles = parseTopicsPaste(pasteText);
    if (!titles.length) return;
    const baseOrder =
      (topics.reduce((max, t) => Math.max(max, t.order), 0) || 0) + 1;
    const added = titles.map((title, i) => ({
      id: newId("topic"),
      title,
      order: baseOrder + i,
    }));
    patch({ topics: [...plan.topics, ...added] });
    setPasteText("");
  }

  function updateTopicTitle(id: string, title: string) {
    patch({
      topics: plan.topics.map((t) => (t.id === id ? { ...t, title } : t)),
    });
  }

  function removeTopic(id: string) {
    patch({
      topics: plan.topics.filter((t) => t.id !== id),
      placements: plan.placements.filter((p) => p.topicId !== id),
    });
  }

  function placementsFor(sectionId: string, date: string): TlpPlacement[] {
    return plan.placements.filter(
      (p) => p.sectionId === sectionId && p.date === date,
    );
  }

  function occFor(sectionId: string, date: string): TlpOccurrence[] {
    return occurrences.filter(
      (o) => o.sectionId === sectionId && o.date === date,
    );
  }

  function onDropTopic(
    sectionId: string,
    date: string,
    e: DragEvent<HTMLDivElement>,
  ) {
    e.preventDefault();
    const topicId = e.dataTransfer.getData(TLP_TOPIC_DRAG_MIME);
    if (!topicId) return;
    const kindAttr = e.currentTarget.dataset.dropKind as SlotKind | undefined;
    const kind = kindAttr || "class";
    const matchingOcc = occFor(sectionId, date)[0];
    const id = placementId(topicId, sectionId, date, kind);
    const existing = plan.placements.find((p) => p.id === id);
    if (existing) return;
    const placement: TlpPlacement = {
      id,
      topicId,
      date,
      sectionId,
      coveragePercent: 0,
      kind,
      slotId: matchingOcc?.slotId,
    };
    patch({ placements: [...plan.placements, placement] });
  }

  function addCustomBlock(
    sectionId: string,
    date: string,
    kind: "lab" | "tutorial",
  ) {
    const topicTitle =
      kind === "lab" ? `Lab · ${date}` : `Tutorial · ${date}`;
    const topic = {
      id: newId("topic"),
      title: topicTitle,
      order:
        (topics.reduce((max, t) => Math.max(max, t.order), 0) || 0) + 1,
    };
    const placement: TlpPlacement = {
      id: placementId(topic.id, sectionId, date, kind),
      topicId: topic.id,
      date,
      sectionId,
      coveragePercent: 0,
      kind,
    };
    patch({
      topics: [...plan.topics, topic],
      placements: [...plan.placements, placement],
    });
  }

  function setPlacementCoverage(placementIdValue: string, raw: number) {
    const pct = clampCoverage(raw);
    patch({
      placements: plan.placements.map((p) =>
        p.id === placementIdValue ? { ...p, coveragePercent: pct } : p,
      ),
    });
  }

  function promptCoverage(placement: TlpPlacement) {
    const raw = window.prompt(
      `Coverage % for this placement (0–100)`,
      String(placement.coveragePercent),
    );
    if (raw == null) return;
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    setPlacementCoverage(placement.id, n);
  }

  const longPressTimer = useRef<number | undefined>(undefined);
  function onChipPointerDown(placement: TlpPlacement) {
    clearLongPress();
    longPressTimer.current = window.setTimeout(
      () => promptCoverage(placement),
      550,
    );
  }
  function clearLongPress() {
    if (longPressTimer.current != null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = undefined;
    }
  }

  const screens: { id: Screen; label: string }[] = [
    { id: "setup", label: "1 · Setup" },
    { id: "schedule", label: "2a · Schedule" },
    { id: "topics", label: "2b · Topics" },
    { id: "map", label: "3 · Map" },
  ];

  return (
    <section className="tlp" aria-label="Teaching Lesson Planner">
      <header className="tlp-header">
        <div>
          <h2>Teaching Lesson Planner</h2>
          <p className="muted">
            Semester timetables → week schedule → topics → map coverage
          </p>
        </div>
        <nav className="tlp-steps" aria-label="TLP screens">
          {screens.map((s) => (
            <button
              key={s.id}
              type="button"
              className={screen === s.id ? "nav-active" : "secondary"}
              onClick={() => setScreen(s.id)}
            >
              {s.label}
            </button>
          ))}
        </nav>
      </header>

      {screen === "setup" ? (
        <div className="tlp-screen">
          <div className="teaching-semester">
            <label>
              Semester start
              <input
                type="date"
                value={plan.semesterStart}
                onChange={(e) => patch({ semesterStart: e.target.value })}
              />
            </label>
            <label>
              Semester end
              <input
                type="date"
                value={plan.semesterEnd}
                onChange={(e) => patch({ semesterEnd: e.target.value })}
              />
            </label>
          </div>

          <div className="tlp-sections" aria-label="Sections">
            <h3>Sections</h3>
            <ul className="tlp-chip-row">
              {sections.map((s) => (
                <li key={s.id}>{s.name}</li>
              ))}
            </ul>
            <p className="muted">Fixed lanes A / B / C for the week strip.</p>
          </div>

          <div className="tlp-subjects">
            <h3>Subjects</h3>
            <ul className="teaching-topic-list">
              {subjects.map((s) => (
                <li key={s.id}>
                  <span className="teaching-topic-order">{s.order}</span>
                  <input
                    value={s.name}
                    onChange={(e) =>
                      patch({
                        subjects: plan.subjects.map((x) =>
                          x.id === s.id ? { ...x, name: e.target.value } : x,
                        ),
                      })
                    }
                  />
                </li>
              ))}
            </ul>
            <form className="teaching-topic-add" onSubmit={onAddSubject}>
              <input name="subjectName" placeholder="New subject" />
              <button type="submit">Add</button>
            </form>
          </div>

          <div className="teaching-timetables">
            <div className="teaching-timetables-head">
              <h3>Timetable versions</h3>
            </div>
            <form className="teaching-tt-add" onSubmit={onAddTimetable}>
              <label>
                Name
                <input name="ttName" required placeholder="e.g. Mid-sem" />
              </label>
              <label>
                From
                <input
                  name="ttFrom"
                  type="date"
                  required
                  defaultValue={plan.semesterStart}
                />
              </label>
              <label>
                To
                <input
                  name="ttTo"
                  type="date"
                  defaultValue={plan.semesterEnd}
                />
              </label>
              <button type="submit">Add version</button>
            </form>
            <ul className="teaching-tt-list">
              {plan.timetables.map((tt) => (
                <li key={tt.id}>
                  <strong>{tt.name}</strong>
                  <span className="muted">
                    {" "}
                    {tt.effectiveFrom}
                    {tt.effectiveTo ? ` → ${tt.effectiveTo}` : ""}
                  </span>
                  <ul className="teaching-tt-slots">
                    {tt.slots.map((slot) => (
                      <li key={slot.id}>
                        {DAY_LABELS[slot.dayOfWeek]} {slot.startTime}–
                        {slot.endTime} ·{" "}
                        {sections.find((s) => s.id === slot.sectionId)?.name ??
                          slot.sectionId}{" "}
                        · {subjectName(slot.subjectId)} · {slot.kind}
                      </li>
                    ))}
                  </ul>
                  <form
                    className="teaching-tt-add"
                    onSubmit={(e) => onAddSlot(tt.id, e)}
                  >
                    <label>
                      Day
                      <select name="day" defaultValue="1">
                        {DAY_LABELS.map((label, i) => (
                          <option key={label} value={i}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Start
                      <input name="start" type="time" defaultValue="09:00" />
                    </label>
                    <label>
                      End
                      <input name="end" type="time" defaultValue="10:30" />
                    </label>
                    <label>
                      Section
                      <select name="section" defaultValue={sections[0]?.id}>
                        {sections.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Subject
                      <select name="subject" defaultValue={subjects[0]?.id}>
                        {subjects.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Kind
                      <select name="kind" defaultValue="class">
                        <option value="class">class</option>
                        <option value="lab">lab</option>
                        <option value="tutorial">tutorial</option>
                      </select>
                    </label>
                    <button type="submit">Add slot</button>
                  </form>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {screen === "schedule" ? (
        <div className="tlp-screen">
          <div className="tlp-week-toolbar">
            <button
              type="button"
              className="secondary"
              onClick={() => setWeekPeriod(shiftWeekPeriod(weekPeriod, -1))}
            >
              ← Prev week
            </button>
            <strong>{weekPeriod}</strong>
            <button
              type="button"
              className="secondary"
              onClick={() => setWeekPeriod(shiftWeekPeriod(weekPeriod, 1))}
            >
              Next week →
            </button>
            <button type="button" onClick={jumpToToday}>
              Jump to today
            </button>
          </div>
          <div className="tlp-week-strip" role="grid" aria-label="Week strip">
            <div className="tlp-week-row tlp-week-head">
              <div className="tlp-sec-label">Section</div>
              {weekKeys.map((key, i) => (
                <div
                  key={key}
                  className={`tlp-day-col${key === today ? " is-today" : ""}`}
                >
                  <span>{WEEKDAY_HEADERS[i]}</span>
                  <span className="muted">{key.slice(5)}</span>
                  {key === today ? (
                    <span className="tlp-today-mark" aria-label="Today">
                      Today
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
            {sections.map((section) => (
              <div key={section.id} className="tlp-week-row" role="row">
                <div className="tlp-sec-label">{section.name}</div>
                {weekKeys.map((key) => {
                  const cells = occFor(section.id, key);
                  return (
                    <div
                      key={key}
                      className={`tlp-day-col${key === today ? " is-today" : ""}`}
                      role="gridcell"
                    >
                      {cells.length === 0 ? (
                        <span className="muted">—</span>
                      ) : (
                        cells.map((o) => (
                          <div key={o.id} className="tlp-occ-chip">
                            <strong>{subjectName(o.subjectId)}</strong>
                            <span>
                              {o.startTime}–{o.endTime}
                            </span>
                            <span className="muted">{o.kind}</span>
                          </div>
                        ))
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          {!todayInWeek ? (
            <p className="muted">
              Today ({today}) is outside this week strip
              {plan.semesterStart
                ? ` · semester ${plan.semesterStart} → ${plan.semesterEnd}`
                : ""}
              .
            </p>
          ) : null}
          <p className="muted">
            {occurrences.length} class occurrences expanded across the semester.
          </p>
        </div>
      ) : null}

      {screen === "topics" ? (
        <div className="tlp-screen tlp-topics-screen">
          <label className="tlp-paste">
            Paste topics (one per line)
            <textarea
              rows={8}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={"Intro & syllabus\nCore concepts\nGuided practice"}
            />
          </label>
          <button type="button" onClick={applyPaste}>
            Add pasted topics
          </button>
          <h3>Topic tray</h3>
          <ul className="teaching-topic-list tlp-tray">
            {topics.map((t) => (
              <li key={t.id}>
                <span className="teaching-topic-order">{t.order}</span>
                <input
                  value={t.title}
                  onChange={(e) => updateTopicTitle(t.id, e.target.value)}
                />
                <button
                  type="button"
                  className="secondary"
                  onClick={() => removeTopic(t.id)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          {topics.length === 0 ? (
            <p className="muted">No topics yet — paste a list above.</p>
          ) : null}
        </div>
      ) : null}

      {screen === "map" ? (
        <div className="tlp-screen tlp-map-screen">
          <div className="tlp-week-toolbar">
            <button
              type="button"
              className="secondary"
              onClick={() => setWeekPeriod(shiftWeekPeriod(weekPeriod, -1))}
            >
              ← Prev week
            </button>
            <strong>{weekPeriod}</strong>
            <button
              type="button"
              className="secondary"
              onClick={() => setWeekPeriod(shiftWeekPeriod(weekPeriod, 1))}
            >
              Next week →
            </button>
            <button type="button" onClick={jumpToToday}>
              Jump to today
            </button>
          </div>

          <aside className="tlp-map-tray" aria-label="Draggable topics">
            <h3>Topics</h3>
            <ul className="tlp-tray">
              {topics.map((t) => (
                <li
                  key={t.id}
                  className="tlp-drag-chip"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(TLP_TOPIC_DRAG_MIME, t.id);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                >
                  {t.title}
                </li>
              ))}
            </ul>
            <p className="muted">
              Drag onto a section×date cell. Right-click / long-press a chip for
              coverage %. Use Lab / Tutorial for custom blocks.
            </p>
          </aside>

          <div className="tlp-week-strip tlp-map-grid" role="grid">
            <div className="tlp-week-row tlp-week-head">
              <div className="tlp-sec-label">Section</div>
              {weekKeys.map((key, i) => (
                <div
                  key={key}
                  className={`tlp-day-col${key === today ? " is-today" : ""}`}
                >
                  <span>{WEEKDAY_HEADERS[i]}</span>
                  <span className="muted">{key.slice(5)}</span>
                </div>
              ))}
            </div>
            {sections.map((section) => (
              <div key={section.id} className="tlp-week-row">
                <div className="tlp-sec-label">{section.name}</div>
                {weekKeys.map((key) => {
                  const placed = placementsFor(section.id, key);
                  const slots = occFor(section.id, key);
                  return (
                    <div
                      key={key}
                      className={`tlp-day-col tlp-drop-cell${key === today ? " is-today" : ""}`}
                      data-drop-kind="class"
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "copy";
                      }}
                      onDrop={(e) => onDropTopic(section.id, key, e)}
                    >
                      {slots.map((o) => (
                        <div key={o.id} className="tlp-occ-hint muted">
                          {subjectName(o.subjectId)} {o.startTime}
                        </div>
                      ))}
                      {placed.map((p) => {
                        const title =
                          topics.find((t) => t.id === p.topicId)?.title ??
                          p.topicId;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            className="tlp-placement-chip"
                            title="Right-click or long-press for coverage"
                            onContextMenu={(e: MouseEvent) => {
                              e.preventDefault();
                              promptCoverage(p);
                            }}
                            onTouchStart={() => onChipPointerDown(p)}
                            onTouchEnd={clearLongPress}
                            onTouchMove={clearLongPress}
                            onMouseDown={() => onChipPointerDown(p)}
                            onMouseUp={clearLongPress}
                            onMouseLeave={clearLongPress}
                          >
                            <span>{title}</span>
                            <span className="muted">
                              {p.kind} · {p.coveragePercent}%
                            </span>
                          </button>
                        );
                      })}
                      <div className="tlp-cell-actions">
                        <button
                          type="button"
                          className="secondary"
                          onClick={() =>
                            addCustomBlock(section.id, key, "lab")
                          }
                        >
                          + Lab
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() =>
                            addCustomBlock(section.id, key, "tutorial")
                          }
                        >
                          + Tutorial
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
