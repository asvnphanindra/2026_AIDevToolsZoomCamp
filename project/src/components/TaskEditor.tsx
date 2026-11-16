import { useEffect, useState, type FormEvent } from "react";
import type { SeedArea } from "@/data/fictional-seed";
import { addMinutes, type PlacedBlock } from "@/lib/blocks";
import { areaColour, emptyTask, type BacklogTask } from "@/lib/tasks";
import { dateKeyInTz, DEFAULT_TZ } from "@/lib/time";

const PRIORITIES = ["low", "med", "high"] as const;

export type TaskEditorSave = {
  task: BacklogTask;
  /** When set, also create/update a placed block for this task. */
  schedule?: { date: string; start: string };
};

type Props = {
  areas: SeedArea[];
  /** Existing task when editing; omit for create. */
  initial?: BacklogTask | null;
  timezone?: string;
  /** Prefill schedule fields (phone quick-add). */
  defaultScheduleDate?: string;
  showSchedule?: boolean;
  submitLabel?: string;
  onSave: (payload: TaskEditorSave) => void;
  onCancel?: () => void;
};

/** Shared task form (desktop inline + phone BottomSheet). */
export function TaskEditor({
  areas,
  initial,
  timezone = DEFAULT_TZ,
  defaultScheduleDate,
  showSchedule = false,
  submitLabel,
  onSave,
  onCancel,
}: Props) {
  const defaultArea = areas[0]?.id ?? "work";
  const [draft, setDraft] = useState<BacklogTask>(() =>
    initial ? { ...initial, due: initial.due ?? "" } : emptyTask(defaultArea),
  );
  const [scheduleOn, setScheduleOn] = useState(Boolean(showSchedule && defaultScheduleDate));
  const [schedDate, setSchedDate] = useState(
    defaultScheduleDate || dateKeyInTz(new Date(), timezone),
  );
  const [schedStart, setSchedStart] = useState("09:00");

  useEffect(() => {
    if (initial) {
      setDraft({ ...initial, due: initial.due ?? "" });
    } else {
      setDraft(emptyTask(defaultArea));
    }
  }, [initial, defaultArea]);

  useEffect(() => {
    setDraft((d) =>
      d.areaId && areas.some((a) => a.id === d.areaId)
        ? d
        : { ...d, areaId: defaultArea },
    );
  }, [areas, defaultArea]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const title = draft.title.trim();
    if (!title || !draft.areaId) return;
    const durationMin = Math.max(5, Number(draft.durationMin) || 30);
    const task: BacklogTask = {
      ...draft,
      id: initial?.id || `task-${Date.now()}`,
      title,
      status: "backlog",
      horizon: draft.horizon || "day",
      durationMin,
      due: draft.due?.trim() || undefined,
      replan: initial?.replan,
    };
    const schedule =
      scheduleOn && schedDate && schedStart
        ? { date: schedDate, start: schedStart }
        : undefined;
    if (schedule) {
      task.status = "scheduled";
    }
    onSave({ task, schedule });
  }

  const listAreas = areas.length ? areas : [];

  return (
    <form className="task-form task-editor" onSubmit={onSubmit}>
      <div className="one-off-row">
        <label>
          Title
          <input
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            placeholder="What needs doing?"
            required
          />
        </label>
        <label>
          Area
          <select
            value={draft.areaId}
            onChange={(e) => setDraft((d) => ({ ...d, areaId: e.target.value }))}
            required
          >
            {listAreas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Minutes
          <input
            type="number"
            min={5}
            step={5}
            value={draft.durationMin}
            onChange={(e) =>
              setDraft((d) => ({ ...d, durationMin: Number(e.target.value) }))
            }
            required
          />
        </label>
        <label>
          Priority
          <select
            value={draft.priority}
            onChange={(e) =>
              setDraft((d) => ({ ...d, priority: e.target.value }))
            }
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label>
          Due
          <input
            type="date"
            value={draft.due ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, due: e.target.value }))}
          />
        </label>
        <label className="task-check">
          <input
            type="checkbox"
            checked={Boolean(draft.deepWork)}
            onChange={(e) =>
              setDraft((d) => ({ ...d, deepWork: e.target.checked }))
            }
          />
          Deep work
        </label>
        {showSchedule ? (
          <>
            <label className="task-check">
              <input
                type="checkbox"
                checked={scheduleOn}
                onChange={(e) => setScheduleOn(e.target.checked)}
              />
              Schedule at
            </label>
            {scheduleOn ? (
              <>
                <label>
                  Date
                  <input
                    type="date"
                    value={schedDate}
                    onChange={(e) => setSchedDate(e.target.value)}
                    required
                  />
                </label>
                <label>
                  Start
                  <input
                    type="time"
                    step={900}
                    value={schedStart}
                    onChange={(e) => setSchedStart(e.target.value)}
                    required
                  />
                </label>
              </>
            ) : null}
          </>
        ) : null}
        <button type="submit" className="tap-target">
          {submitLabel ?? (initial ? "Save" : "Add")}
        </button>
        {onCancel ? (
          <button
            type="button"
            className="secondary tap-target"
            onClick={onCancel}
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}

/** Build a PlacedBlock for a newly saved scheduled task. */
export function placedBlockFromSchedule(
  task: BacklogTask,
  schedule: { date: string; start: string },
  areas: SeedArea[],
): PlacedBlock {
  const end = addMinutes(schedule.start, task.durationMin);
  return {
    id: `block-${Date.now()}`,
    taskId: task.id,
    title: task.title,
    areaId: task.areaId,
    colour: areaColour(areas, task.areaId),
    date: schedule.date,
    start: schedule.start,
    end,
    deepWork: task.deepWork,
  };
}
