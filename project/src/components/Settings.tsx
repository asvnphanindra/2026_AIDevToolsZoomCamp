import { useState } from "react";
import { BottomSheet } from "@/components/BottomSheet";
import type {
  SeedArea,
  SeedBand,
  SeedRoutine,
  SeedSchedule,
} from "@/data/fictional-seed";
import {
  saveBands,
  saveRoutines,
  saveSchedules,
  saveUserSettings,
  type UserSettings,
} from "@/lib/config";
import { replaceCollection, type PlannerRoot } from "@/lib/planner-store";
import type { DailyRule } from "@/lib/rules";
import type { CalendarSeries } from "@/lib/calendar-series";

type SectionId =
  | "areas"
  | "bands"
  | "slots"
  | "minimums"
  | "schedule"
  | "recurring"
  | "prefs";

type Props = {
  root: PlannerRoot;
  settings: UserSettings;
  onSettingsChange: (settings: UserSettings) => void;
  areas: SeedArea[];
  onAreasChange: (areas: SeedArea[]) => void;
  bands: SeedBand[];
  onBandsChange: (bands: SeedBand[]) => void;
  routines: SeedRoutine[];
  onRoutinesChange: (routines: SeedRoutine[]) => void;
  schedules: SeedSchedule[];
  onSchedulesChange: (schedules: SeedSchedule[]) => void;
  rules: DailyRule[];
  onRulesChange: (rules: DailyRule[]) => void;
  series: CalendarSeries[];
  onSeriesChange: (series: CalendarSeries[]) => void;
  onRerunSetup?: () => void;
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function Settings({
  root,
  settings,
  onSettingsChange,
  areas,
  onAreasChange,
  bands,
  onBandsChange,
  routines,
  onRoutinesChange,
  schedules,
  onSchedulesChange,
  rules,
  onRulesChange,
  series,
  onSeriesChange,
  onRerunSetup,
}: Props) {
  const [section, setSection] = useState<SectionId | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function persistAreas(next: SeedArea[]) {
    setBusy(true);
    setError(null);
    try {
      await replaceCollection(root, "areas", next);
      onAreasChange(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function persistBands(next: SeedBand[]) {
    setBusy(true);
    setError(null);
    try {
      await saveBands(root, next);
      onBandsChange(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function persistRoutines(next: SeedRoutine[]) {
    setBusy(true);
    setError(null);
    try {
      await saveRoutines(root, next);
      onRoutinesChange(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function persistSchedules(next: SeedSchedule[]) {
    setBusy(true);
    setError(null);
    try {
      await saveSchedules(root, next);
      onSchedulesChange(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function persistRules(next: DailyRule[]) {
    setBusy(true);
    setError(null);
    try {
      await replaceCollection(root, "rules", next);
      onRulesChange(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function persistSeries(next: CalendarSeries[]) {
    setBusy(true);
    setError(null);
    try {
      await replaceCollection(root, "series", next);
      onSeriesChange(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function persistSettings(next: UserSettings) {
    setBusy(true);
    setError(null);
    try {
      if (root[0] === "users") {
        await saveUserSettings(root[1], next);
      }
      onSettingsChange(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  const sections: { id: SectionId; title: string; summary: string }[] = [
    {
      id: "areas",
      title: "Life areas",
      summary: `${areas.length} area${areas.length === 1 ? "" : "s"}`,
    },
    {
      id: "bands",
      title: "Energy bands",
      summary: `${bands.length} band${bands.length === 1 ? "" : "s"}`,
    },
    {
      id: "slots",
      title: "Commute & low-focus slots",
      summary: `${routines.length} slot${routines.length === 1 ? "" : "s"}`,
    },
    {
      id: "minimums",
      title: "Daily minimums",
      summary: `${rules.length} rule${rules.length === 1 ? "" : "s"}`,
    },
    {
      id: "schedule",
      title: "Schedule",
      summary: `${schedules.length} item${schedules.length === 1 ? "" : "s"}`,
    },
    {
      id: "recurring",
      title: "Recurring items",
      summary: `${series.length} series`,
    },
    {
      id: "prefs",
      title: "Cadence, reminders, timezone",
      summary: `${settings.timezone} · ${settings.checkInCadence} · ${settings.reminderDefaultMin}m`,
    },
  ];

  return (
    <section className="settings-panel" aria-label="Settings">
      <h2>Settings</h2>
      <p className="muted">
        Edit the same sections as setup. Changes apply to the grid immediately.
      </p>
      {settings.templateId ? (
        <p className="muted">Template: {settings.templateId}</p>
      ) : null}
      {error ? <p className="error">{error}</p> : null}

      <ul className="settings-section-list">
        {sections.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              className="settings-section-btn tap-target"
              disabled={busy}
              onClick={() => setSection(s.id)}
            >
              <strong>{s.title}</strong>
              <span className="muted">{s.summary}</span>
            </button>
          </li>
        ))}
      </ul>

      {onRerunSetup ? (
        <button
          type="button"
          className="secondary tap-target"
          onClick={onRerunSetup}
        >
          Run setup wizard again
        </button>
      ) : null}

      <BottomSheet
        open={section != null}
        title={sections.find((s) => s.id === section)?.title || "Edit"}
        onClose={() => setSection(null)}
      >
        {section === "areas" ? (
          <div className="setup-list">
            {areas.map((a) => (
              <label key={a.id} className="setup-row">
                <input
                  className="tap-target"
                  value={a.name}
                  onChange={(e) =>
                    void persistAreas(
                      areas.map((x) =>
                        x.id === a.id ? { ...x, name: e.target.value } : x,
                      ),
                    )
                  }
                />
              </label>
            ))}
            <button
              type="button"
              className="tap-target"
              onClick={() =>
                void persistAreas([
                  ...areas,
                  {
                    id: `area-${Date.now()}`,
                    name: `Area ${areas.length + 1}`,
                    colour: "#0F6B4C",
                    order: areas.length + 1,
                  },
                ])
              }
            >
              Add area
            </button>
          </div>
        ) : null}

        {section === "bands" ? (
          <div className="setup-list">
            {bands.map((b) => (
              <div key={b.id} className="setup-row setup-row-wrap">
                <select
                  className="tap-target"
                  value={b.level}
                  onChange={(e) =>
                    void persistBands(
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
                    void persistBands(
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
                    void persistBands(
                      bands.map((x) =>
                        x.id === b.id ? { ...x, end: e.target.value } : x,
                      ),
                    )
                  }
                />
              </div>
            ))}
            <button
              type="button"
              className="tap-target"
              onClick={() =>
                void persistBands([
                  ...bands,
                  {
                    id: `band-${Date.now()}`,
                    level: "medium",
                    start: "09:00",
                    end: "12:00",
                    weekdays: [1, 2, 3, 4, 5],
                  },
                ])
              }
            >
              Add band
            </button>
          </div>
        ) : null}

        {section === "slots" ? (
          <div className="setup-list">
            {routines.map((r) => (
              <div key={r.id} className="setup-row setup-row-wrap">
                <input
                  className="tap-target"
                  value={r.label}
                  onChange={(e) =>
                    void persistRoutines(
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
                    void persistRoutines(
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
                    void persistRoutines(
                      routines.map((x) =>
                        x.id === r.id ? { ...x, end: e.target.value } : x,
                      ),
                    )
                  }
                />
              </div>
            ))}
            <button
              type="button"
              className="tap-target"
              onClick={() =>
                void persistRoutines([
                  ...routines,
                  {
                    id: `slot-${Date.now()}`,
                    label: "Low-focus slot",
                    start: "08:00",
                    end: "08:45",
                    weekdays: [1, 2, 3, 4, 5],
                  },
                ])
              }
            >
              Add slot
            </button>
          </div>
        ) : null}

        {section === "minimums" ? (
          <div className="setup-list">
            {rules.map((r) => (
              <div key={r.id} className="setup-row setup-row-wrap">
                <input
                  className="tap-target"
                  value={r.label || ""}
                  onChange={(e) =>
                    void persistRules(
                      rules.map((x) =>
                        x.id === r.id ? { ...x, label: e.target.value } : x,
                      ),
                    )
                  }
                />
                <input
                  type="number"
                  className="tap-target"
                  value={r.minMinutesPerDay}
                  onChange={(e) =>
                    void persistRules(
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
              </div>
            ))}
          </div>
        ) : null}

        {section === "schedule" ? (
          <div className="setup-list">
            {schedules.map((s) => (
              <div key={s.id} className="setup-row setup-row-wrap">
                <input
                  className="tap-target"
                  value={s.title}
                  onChange={(e) =>
                    void persistSchedules(
                      schedules.map((x) =>
                        x.id === s.id ? { ...x, title: e.target.value } : x,
                      ),
                    )
                  }
                />
                <span className="muted">
                  {WEEKDAY_LABELS[s.weekday] || "?"} {s.start}–{s.end}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        {section === "recurring" ? (
          <div className="setup-list">
            {series.map((s) => (
              <div key={s.id} className="setup-row">
                <input
                  className="tap-target"
                  value={s.label}
                  onChange={(e) =>
                    void persistSeries(
                      series.map((x) =>
                        x.id === s.id ? { ...x, label: e.target.value } : x,
                      ),
                    )
                  }
                />
              </div>
            ))}
          </div>
        ) : null}

        {section === "prefs" ? (
          <div className="setup-list">
            <label className="setup-row">
              Timezone
              <input
                className="tap-target"
                value={settings.timezone}
                onChange={(e) =>
                  void persistSettings({
                    ...settings,
                    timezone: e.target.value,
                  })
                }
              />
            </label>
            <label className="setup-row">
              Check-in cadence
              <select
                className="tap-target"
                value={settings.checkInCadence}
                onChange={(e) =>
                  void persistSettings({
                    ...settings,
                    checkInCadence: e.target
                      .value as UserSettings["checkInCadence"],
                  })
                }
              >
                <option value="after-block">After every block</option>
                <option value="timed">At set times</option>
                <option value="end-of-day">End of day only</option>
              </select>
            </label>
            <label className="setup-row">
              Reminder (minutes)
              <input
                type="number"
                className="tap-target"
                value={settings.reminderDefaultMin}
                onChange={(e) =>
                  void persistSettings({
                    ...settings,
                    reminderDefaultMin: Number(e.target.value) || 0,
                  })
                }
              />
            </label>
          </div>
        ) : null}
      </BottomSheet>
    </section>
  );
}
