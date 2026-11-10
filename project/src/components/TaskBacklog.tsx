import { useEffect, useState, type FormEvent } from "react";
import type { SeedArea } from "@/data/fictional-seed";
import {
  areaColour,
  areaName,
  emptyTask,
  loadBacklog,
  TASK_DRAG_MIME,
  writeBacklog,
  type BacklogTask,
} from "@/lib/tasks";

type Props = {
  isDemo: boolean;
  areas: SeedArea[];
  tasks: BacklogTask[];
  onTasksChange: (tasks: BacklogTask[]) => void;
};

const PRIORITIES = ["low", "med", "high"] as const;

/** US-C1 backlog + US-C2 drag source. */
export function TaskBacklog({
  isDemo,
  areas,
  tasks,
  onTasksChange,
}: Props) {
  const defaultArea = areas[0]?.id ?? "work";
  const [draft, setDraft] = useState<BacklogTask>(() => emptyTask(defaultArea));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    if (booted) return;
    if (tasks.length === 0) {
      const loaded = loadBacklog(isDemo);
      if (loaded.length) {
        onTasksChange(loaded);
        writeBacklog(loaded);
      }
    }
    setBooted(true);
  }, [booted, isDemo, onTasksChange, tasks.length]);

  useEffect(() => {
    setDraft((d) =>
      d.areaId && areas.some((a) => a.id === d.areaId)
        ? d
        : { ...d, areaId: defaultArea },
    );
  }, [areas, defaultArea]);

  function persist(next: BacklogTask[]) {
    onTasksChange(next);
    writeBacklog(next);
  }

  function startEdit(task: BacklogTask) {
    setEditingId(task.id);
    setDraft({ ...task, due: task.due ?? "" });
  }

  function resetForm() {
    setEditingId(null);
    setDraft(emptyTask(defaultArea));
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const title = draft.title.trim();
    if (!title || !draft.areaId) return;

    const payload: BacklogTask = {
      ...draft,
      title,
      status: "backlog",
      horizon: draft.horizon || "day",
      durationMin: Math.max(5, Number(draft.durationMin) || 30),
      due: draft.due?.trim() || undefined,
    };

    if (editingId) {
      persist(
        tasks.map((t) => (t.id === editingId ? { ...payload, id: editingId } : t)),
      );
    } else {
      const id = `task-${Date.now()}`;
      persist([{ ...payload, id }, ...tasks]);
    }
    resetForm();
  }

  function remove(id: string) {
    if (!window.confirm("Delete this backlog task?")) return;
    persist(tasks.filter((t) => t.id !== id));
    if (editingId === id) resetForm();
  }

  const openTasks = tasks.filter((t) => t.status === "backlog");
  const listAreas = areas.length ? areas : [];

  return (
    <section className="task-backlog" aria-label="Task backlog">
      <div className="day-grid-meta">
        <h2>Backlog</h2>
        <p className="muted">
          Capture tasks, then drag onto the week grid (US-C2).
        </p>
      </div>

      <form className="task-form" onSubmit={onSubmit}>
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
              onChange={(e) =>
                setDraft((d) => ({ ...d, areaId: e.target.value }))
              }
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
            Duration (min)
            <input
              type="number"
              min={5}
              step={5}
              value={draft.durationMin}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  durationMin: Number(e.target.value),
                }))
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
            Due (optional)
            <input
              type="date"
              value={draft.due ?? ""}
              onChange={(e) =>
                setDraft((d) => ({ ...d, due: e.target.value }))
              }
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
          <button type="submit">{editingId ? "Save" : "Add"}</button>
          {editingId ? (
            <button type="button" className="secondary" onClick={resetForm}>
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      {openTasks.length === 0 ? (
        <p className="muted">No open backlog tasks — drag created blocks on the grid.</p>
      ) : (
        <ul className="task-list">
          {openTasks.map((task) => (
            <li
              key={task.id}
              className="task-row is-draggable"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(TASK_DRAG_MIME, task.id);
                e.dataTransfer.setData("text/plain", task.id);
                e.dataTransfer.effectAllowed = "copyMove";
              }}
            >
              <span
                className="swatch"
                style={{ background: areaColour(listAreas, task.areaId) }}
                aria-hidden
              />
              <div className="task-main">
                <strong>{task.title}</strong>
                <span className="muted">
                  {areaName(listAreas, task.areaId)} · {task.durationMin}m ·{" "}
                  {task.priority}
                  {task.due ? ` · due ${task.due}` : ""}
                  {task.deepWork ? " · deep work" : ""} · drag to grid
                </span>
              </div>
              <div className="task-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => startEdit(task)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => remove(task.id)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
