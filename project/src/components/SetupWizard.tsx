import { useMemo, useState } from "react";
import {
  SETUP_TEMPLATES,
  applyTemplate,
  materializeTemplateSeries,
  type SetupTemplateId,
} from "@/data/templates";
import type {
  SeedArea,
  SeedBand,
  SeedRoutine,
  SeedSchedule,
} from "@/data/fictional-seed";
import {
  DEFAULT_USER_SETTINGS,
  saveBands,
  saveRoutines,
  saveSchedules,
  saveUserSettings,
  type UserSettings,
} from "@/lib/config";
import { replaceCollection, type PlannerRoot } from "@/lib/planner-store";
import type { DailyRule } from "@/lib/rules";
import type { CalendarSeries } from "@/lib/calendar-series";
import { dateKeyInTz, DEFAULT_TZ } from "@/lib/time";

export type SetupWizardResult = {
  templateId: SetupTemplateId;
  areas: SeedArea[];
  bands: SeedBand[];
  routines: SeedRoutine[];
  schedules: SeedSchedule[];
  rules: DailyRule[];
  series: CalendarSeries[];
  settings: UserSettings;
};

type StepId =
  | "template"
  | "areas"
  | "bands"
  | "slots"
  | "minimums"
  | "schedule"
  | "recurring"
  | "cadence"
  | "reminders"
  | "timezone";

const STEPS: { id: StepId; title: string; hint: string }[] = [
  { id: "template", title: "Template", hint: "Pick a starting setup" },
  { id: "areas", title: "Life areas", hint: "Name the areas you plan around" },
  { id: "bands", title: "Energy bands", hint: "When is your energy high / medium?" },
  { id: "slots", title: "Commute & low-focus", hint: "Slots for listen or review only" },
  { id: "minimums", title: "Daily minimums", hint: "Soft daily minute targets" },
  { id: "schedule", title: "Schedule", hint: "Fixed classes or meetings" },
  { id: "recurring", title: "Recurring", hint: "Repeating personal items" },
  { id: "cadence", title: "Check-ins", hint: "How often to prompt after work" },
  { id: "reminders", title: "Reminders", hint: "Default minutes before timed items" },
  { id: "timezone", title: "Timezone", hint: "Clock and day boundaries" },
];

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const AREA_COLOURS = ["#0F6B4C", "#1D4E89", "#A15C07", "#7A3E9D", "#2A7A4B"];

type Props = {
  root: PlannerRoot;
  /** When true, finish also marks setupDone. */
  onComplete: (result: SetupWizardResult) => void;
  onSkipAll?: () => void;
  heading?: string;
};

function cloneAreas(areas: SeedArea[]): SeedArea[] {
  return areas.map((a) => ({ ...a }));
}

export function SetupWizard({
  root,
  onComplete,
  onSkipAll,
  heading = "Set up your planner",
}: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<SetupTemplateId | null>(null);
  const [areas, setAreas] = useState<SeedArea[]>([]);
  const [bands, setBands] = useState<SeedBand[]>([]);
  const [routines, setRoutines] = useState<SeedRoutine[]>([]);
  const [schedules, setSchedules] = useState<SeedSchedule[]>([]);
  const [rules, setRules] = useState<DailyRule[]>([]);
  const [series, setSeries] = useState<CalendarSeries[]>([]);
  const [settings, setSettings] = useState<UserSettings>({
    ...DEFAULT_USER_SETTINGS,
  });
  const [notifAsked, setNotifAsked] = useState(false);

  const step = STEPS[stepIndex]!;
  const isLast = stepIndex === STEPS.length - 1;

  const areaName = useMemo(() => {
    const map = new Map(areas.map((a) => [a.id, a.name]));
    return (id: string) => map.get(id) || id;
  }, [areas]);

  async function pickTemplate(id: SetupTemplateId) {
    setBusy(true);
    setError(null);
    try {
      const applied = await applyTemplate(root, id, { setupDone: false });
      setTemplateId(id);
      setAreas(cloneAreas(applied.areas));
      setBands(applied.bands.map((b) => ({ ...b })));
      setRoutines(applied.routines.map((r) => ({ ...r })));
      setSchedules(applied.schedule.map((s) => ({ ...s })));
      setRules(applied.rules.map((r) => ({ ...r })));
      const tz = applied.settings.timezone || DEFAULT_TZ;
      const todayKey = dateKeyInTz(new Date(), tz);
      setSeries(materializeTemplateSeries(applied.series, todayKey));
      setSettings({
        ...DEFAULT_USER_SETTINGS,
        ...applied.settings,
        templateId: id,
        setupDone: false,
      });
      setStepIndex(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply template");
    } finally {
      setBusy(false);
    }
  }

  async function persistStep(nextIndex: number) {
    setBusy(true);
    setError(null);
    try {
      if (step.id === "areas") {
        await replaceCollection(root, "areas", areas);
      } else if (step.id === "bands") {
        await saveBands(root, bands);
      } else if (step.id === "slots") {
        await saveRoutines(root, routines);
      } else if (step.id === "minimums") {
        await replaceCollection(root, "rules", rules);
      } else if (step.id === "schedule") {
        await saveSchedules(root, schedules);
      } else if (step.id === "recurring") {
        await replaceCollection(root, "series", series);
      } else if (
        step.id === "cadence" ||
        step.id === "reminders" ||
        step.id === "timezone"
      ) {
        if (root[0] === "users") {
          await saveUserSettings(root[1], {
            ...settings,
            setupDone: false,
            templateId: templateId || settings.templateId,
          });
        }
      }
      setStepIndex(nextIndex);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    if (!templateId) {
      setError("Pick a template first");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const finalSettings: UserSettings = {
        ...settings,
        templateId,
        setupDone: true,
      };
      await Promise.all([
        replaceCollection(root, "areas", areas),
        saveBands(root, bands),
        saveRoutines(root, routines),
        saveSchedules(root, schedules),
        replaceCollection(root, "rules", rules),
        replaceCollection(root, "series", series),
      ]);
      if (root[0] === "users") {
        await saveUserSettings(root[1], finalSettings);
      }
      onComplete({
        templateId,
        areas,
        bands,
        routines,
        schedules,
        rules,
        series,
        settings: finalSettings,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Finish failed");
    } finally {
      setBusy(false);
    }
  }

  function skipStep() {
    if (isLast) void finish();
    else setStepIndex(stepIndex + 1);
  }

  function requestNotificationPermission() {
    setNotifAsked(true);
    if (typeof Notification === "undefined") return;
    void Notification.requestPermission().catch(() => undefined);
  }

  function addArea() {
    const n = areas.length + 1;
    setAreas([
      ...areas,
      {
        id: `area-${Date.now()}`,
        name: `Area ${n}`,
        colour: AREA_COLOURS[(n - 1) % AREA_COLOURS.length]!,
        order: n,
      },
    ]);
  }

  function addBand() {
    setBands([
      ...bands,
      {
        id: `band-${Date.now()}`,
        level: "medium",
        start: "09:00",
        end: "12:00",
        weekdays: [1, 2, 3, 4, 5],
      },
    ]);
  }

  function addSlot() {
    setRoutines([
      ...routines,
      {
        id: `slot-${Date.now()}`,
        label: "Low-focus slot",
        start: "08:00",
        end: "08:45",
        weekdays: [1, 2, 3, 4, 5],
      },
    ]);
  }

  function addRule() {
    const areaId = areas[0]?.id || "area";
    setRules([
      ...rules,
      {
        id: `rule-${Date.now()}`,
        areaId,
        minMinutesPerDay: 60,
        label: "Daily minimum",
      },
    ]);
  }

  function addSchedule() {
    setSchedules([
      ...schedules,
      {
        id: `sched-${Date.now()}`,
        title: "Fixed block",
        start: "09:00",
        end: "10:00",
        weekday: 1,
        kind: "meeting",
      },
    ]);
  }

  function addSeries() {
    const today = new Date().toISOString().slice(0, 10);
    setSeries([
      ...series,
      {
        id: `ser-${Date.now()}`,
        label: "Recurring item",
        kind: "appointment",
        rule: { freq: "weeks", interval: 1 },
        startDate: today,
        paused: false,
        time: "10:00",
      },
    ]);
  }

  return (
    <section className="setup-wizard" aria-label="Setup wizard">
      <header className="setup-wizard-header">
        <h2>{heading}</h2>
        <p className="muted">
          Step {stepIndex + 1} of {STEPS.length}: {step.title}
        </p>
        <p className="lede">{step.hint}</p>
      </header>

      <div className="setup-wizard-body">
        {step.id === "template" ? (
          <ul className="template-picker">
            {SETUP_TEMPLATES.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  className={`template-card tap-target${templateId === t.id ? " is-selected" : ""}`}
                  disabled={busy}
                  onClick={() => void pickTemplate(t.id)}
                >
                  <strong>{t.name}</strong>
                  <span className="muted">{t.description}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {step.id === "areas" ? (
          <div className="setup-list">
            {areas.map((a) => (
              <label key={a.id} className="setup-row">
                <span
                  className="planner-area-swatch"
                  style={{ background: a.colour }}
                  aria-hidden
                />
                <input
                  className="tap-target"
                  value={a.name}
                  onChange={(e) =>
                    setAreas(
                      areas.map((x) =>
                        x.id === a.id ? { ...x, name: e.target.value } : x,
                      ),
                    )
                  }
                />
                <button
                  type="button"
                  className="secondary tap-target"
                  onClick={() => setAreas(areas.filter((x) => x.id !== a.id))}
                >
                  Remove
                </button>
              </label>
            ))}
            <button type="button" className="tap-target" onClick={addArea}>
              Add area
            </button>
          </div>
        ) : null}

        {step.id === "bands" ? (
          <div className="setup-list">
            {bands.map((b) => (
              <div key={b.id} className="setup-row setup-row-wrap">
                <select
                  className="tap-target"
                  value={b.level}
                  onChange={(e) =>
                    setBands(
                      bands.map((x) =>
                        x.id === b.id
                          ? {
                              ...x,
                              level: e.target.value as SeedBand["level"],
                            }
                          : x,
                      ),
                    )
                  }
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <input
                  type="time"
                  className="tap-target"
                  value={b.start}
                  onChange={(e) =>
                    setBands(
                      bands.map((x) =>
                        x.id === b.id ? { ...x, start: e.target.value } : x,
                      ),
                    )
                  }
                />
                <input
                  type="time"
                  className="tap-target"
                  value={b.end}
                  onChange={(e) =>
                    setBands(
                      bands.map((x) =>
                        x.id === b.id ? { ...x, end: e.target.value } : x,
                      ),
                    )
                  }
                />
                <button
                  type="button"
                  className="secondary tap-target"
                  onClick={() => setBands(bands.filter((x) => x.id !== b.id))}
                >
                  Remove
                </button>
              </div>
            ))}
            <button type="button" className="tap-target" onClick={addBand}>
              Add band
            </button>
          </div>
        ) : null}

        {step.id === "slots" ? (
          <div className="setup-list">
            {routines.map((r) => (
              <div key={r.id} className="setup-row setup-row-wrap">
                <input
                  className="tap-target"
                  value={r.label}
                  onChange={(e) =>
                    setRoutines(
                      routines.map((x) =>
                        x.id === r.id ? { ...x, label: e.target.value } : x,
                      ),
                    )
                  }
                />
                <input
                  type="time"
                  className="tap-target"
                  value={r.start}
                  onChange={(e) =>
                    setRoutines(
                      routines.map((x) =>
                        x.id === r.id ? { ...x, start: e.target.value } : x,
                      ),
                    )
                  }
                />
                <input
                  type="time"
                  className="tap-target"
                  value={r.end}
                  onChange={(e) =>
                    setRoutines(
                      routines.map((x) =>
                        x.id === r.id ? { ...x, end: e.target.value } : x,
                      ),
                    )
                  }
                />
                <button
                  type="button"
                  className="secondary tap-target"
                  onClick={() =>
                    setRoutines(routines.filter((x) => x.id !== r.id))
                  }
                >
                  Remove
                </button>
              </div>
            ))}
            <button type="button" className="tap-target" onClick={addSlot}>
              Add slot
            </button>
          </div>
        ) : null}

        {step.id === "minimums" ? (
          <div className="setup-list">
            {rules.map((r) => (
              <div key={r.id} className="setup-row setup-row-wrap">
                <input
                  className="tap-target"
                  value={r.label || ""}
                  placeholder="Label"
                  onChange={(e) =>
                    setRules(
                      rules.map((x) =>
                        x.id === r.id ? { ...x, label: e.target.value } : x,
                      ),
                    )
                  }
                />
                <select
                  className="tap-target"
                  value={r.areaId}
                  onChange={(e) =>
                    setRules(
                      rules.map((x) =>
                        x.id === r.id ? { ...x, areaId: e.target.value } : x,
                      ),
                    )
                  }
                >
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={15}
                  step={15}
                  className="tap-target"
                  value={r.minMinutesPerDay}
                  onChange={(e) =>
                    setRules(
                      rules.map((x) =>
                        x.id === r.id
                          ? {
                              ...x,
                              minMinutesPerDay: Number(e.target.value) || 0,
                            }
                          : x,
                      ),
                    )
                  }
                />
                <span className="muted">min · {areaName(r.areaId)}</span>
                <button
                  type="button"
                  className="secondary tap-target"
                  onClick={() => setRules(rules.filter((x) => x.id !== r.id))}
                >
                  Remove
                </button>
              </div>
            ))}
            <button type="button" className="tap-target" onClick={addRule}>
              Add minimum
            </button>
          </div>
        ) : null}

        {step.id === "schedule" ? (
          <div className="setup-list">
            {schedules.map((s) => (
              <div key={s.id} className="setup-row setup-row-wrap">
                <input
                  className="tap-target"
                  value={s.title}
                  onChange={(e) =>
                    setSchedules(
                      schedules.map((x) =>
                        x.id === s.id ? { ...x, title: e.target.value } : x,
                      ),
                    )
                  }
                />
                <select
                  className="tap-target"
                  value={s.weekday}
                  onChange={(e) =>
                    setSchedules(
                      schedules.map((x) =>
                        x.id === s.id
                          ? { ...x, weekday: Number(e.target.value) }
                          : x,
                      ),
                    )
                  }
                >
                  {WEEKDAY_LABELS.map((label, i) => (
                    <option key={label} value={i}>
                      {label}
                    </option>
                  ))}
                </select>
                <input
                  type="time"
                  className="tap-target"
                  value={s.start}
                  onChange={(e) =>
                    setSchedules(
                      schedules.map((x) =>
                        x.id === s.id ? { ...x, start: e.target.value } : x,
                      ),
                    )
                  }
                />
                <input
                  type="time"
                  className="tap-target"
                  value={s.end}
                  onChange={(e) =>
                    setSchedules(
                      schedules.map((x) =>
                        x.id === s.id ? { ...x, end: e.target.value } : x,
                      ),
                    )
                  }
                />
                <button
                  type="button"
                  className="secondary tap-target"
                  onClick={() =>
                    setSchedules(schedules.filter((x) => x.id !== s.id))
                  }
                >
                  Remove
                </button>
              </div>
            ))}
            <button type="button" className="tap-target" onClick={addSchedule}>
              Add schedule item
            </button>
          </div>
        ) : null}

        {step.id === "recurring" ? (
          <div className="setup-list">
            {series.map((s) => (
              <div key={s.id} className="setup-row setup-row-wrap">
                <input
                  className="tap-target"
                  value={s.label}
                  onChange={(e) =>
                    setSeries(
                      series.map((x) =>
                        x.id === s.id ? { ...x, label: e.target.value } : x,
                      ),
                    )
                  }
                />
                <input
                  type="time"
                  className="tap-target"
                  value={s.time || ""}
                  onChange={(e) =>
                    setSeries(
                      series.map((x) =>
                        x.id === s.id ? { ...x, time: e.target.value } : x,
                      ),
                    )
                  }
                />
                <button
                  type="button"
                  className="secondary tap-target"
                  onClick={() => setSeries(series.filter((x) => x.id !== s.id))}
                >
                  Remove
                </button>
              </div>
            ))}
            <button type="button" className="tap-target" onClick={addSeries}>
              Add recurring item
            </button>
          </div>
        ) : null}

        {step.id === "cadence" ? (
          <fieldset className="setup-fieldset">
            <legend>Check-in cadence</legend>
            {(
              [
                ["after-block", "After every block"],
                ["timed", "At set times"],
                ["end-of-day", "End of day only"],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="setup-radio tap-target">
                <input
                  type="radio"
                  name="cadence"
                  checked={settings.checkInCadence === value}
                  onChange={() =>
                    setSettings({ ...settings, checkInCadence: value })
                  }
                />
                {label}
              </label>
            ))}
          </fieldset>
        ) : null}

        {step.id === "reminders" ? (
          <div className="setup-list">
            <label className="setup-row">
              Default reminder (minutes)
              <input
                type="number"
                min={0}
                step={5}
                className="tap-target"
                value={settings.reminderDefaultMin}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    reminderDefaultMin: Number(e.target.value) || 0,
                  })
                }
              />
            </label>
            <button
              type="button"
              className="secondary tap-target"
              onClick={requestNotificationPermission}
            >
              {notifAsked
                ? "Notification permission requested"
                : "Allow notifications"}
            </button>
          </div>
        ) : null}

        {step.id === "timezone" ? (
          <label className="setup-row">
            Timezone
            <input
              className="tap-target"
              list="tz-list"
              value={settings.timezone}
              onChange={(e) =>
                setSettings({ ...settings, timezone: e.target.value })
              }
            />
            <datalist id="tz-list">
              <option value="Asia/Kolkata" />
              <option value="UTC" />
              <option value="America/New_York" />
              <option value="Europe/London" />
            </datalist>
          </label>
        ) : null}
      </div>

      {error ? <p className="error">{error}</p> : null}

      <footer className="setup-wizard-actions">
        <button
          type="button"
          className="secondary tap-target"
          disabled={busy || stepIndex === 0}
          onClick={() => setStepIndex(Math.max(0, stepIndex - 1))}
        >
          Back
        </button>
        <button
          type="button"
          className="secondary tap-target"
          disabled={busy || step.id === "template"}
          onClick={skipStep}
        >
          Skip
        </button>
        {onSkipAll && step.id === "template" ? (
          <button
            type="button"
            className="secondary tap-target"
            disabled={busy}
            onClick={onSkipAll}
          >
            Skip setup
          </button>
        ) : null}
        <button
          type="button"
          className="tap-target"
          disabled={busy || (step.id === "template" && !templateId)}
          onClick={() => {
            if (step.id === "template") {
              if (templateId) setStepIndex(1);
              return;
            }
            if (isLast) void finish();
            else void persistStep(stepIndex + 1);
          }}
        >
          {isLast ? "Finish" : "Next"}
        </button>
      </footer>
    </section>
  );
}
