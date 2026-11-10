import { useEffect, useState, type DragEvent, type FormEvent } from "react";
import type { SeedArea } from "@/data/fictional-seed";
import { BLOCK_DRAG_MIME, type PlacedBlock } from "@/lib/blocks";
import {
  seedRepeatingTasks,
  REPEAT_DRAG_MIME,
  type RepeatingTask,
} from "@/lib/repeating";
import {
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
  placedBlocks: PlacedBlock[];
  onPlacedBlocksChange: (blocks: PlacedBlock[]) => void;
};

const PRIORITIES = ["low", "med", "high"] as const;

/** US-C1 backlog + repeating templates + accept blocks from grid. */
export function TaskBacklog({
  isDemo,
  areas,
  tasks,
  onTasksChange,
  placedBlocks,
  onPlacedBlocksChange,
}: Props) {
  const defaultArea = areas[0]?.id ?? "work";
  const [draft, setDraft] = useState<BacklogTask>(() => emptyTask(defaultArea));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [booted, setBooted] = useState(false);
  const [dropReady, setDropReady] = useState(false);
  const repeating = seedRepeatingTasks();

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

  function acceptBlockFromGrid(blockId: string) {
    const block = placedBlocks.find((b) => b.id === blockId);
    if (!block) return;
    onPlacedBlocksChange(placedBlocks.filter((b) => b.id !== blockId));
    if (block.taskId) {
      const hit = tasks.find((t) => t.id === block.taskId);
      if (hit) {
        persist(
          tasks.map((t) =>
            t.id === block.taskId ? { ...t, status: "backlog" } : t,
          ),
        );
        return;
      }
    }
    const taskId = block.taskId || `task-return-${Date.now()}`;
    const durationMin = Math.max(
      15,
      (() => {
        const [sh, sm] = block.start.split(":").map(Number);
        const [eh, em] = block.end.split(":").map(Number);
        return (eh! * 60 + (em ?? 0)) - (sh! * 60 + (sm ?? 0));
      })(),
    );
    persist([
      {
        id: taskId,
        title: block.title,
        areaId: block.areaId,
        durationMin,
        priority: "med",
        status: "backlog",
        horizon: "day",
        deepWork: block.deepWork,
      },
      ...tasks.filter((t) => t.id !== taskId),
    ]);
  }

  function onBacklogDragOver(e: DragEvent<HTMLElement>) {
    const types = Array.from(e.dataTransfer.types);
    if (!types.includes(BLOCK_DRAG_MIME)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropReady(true);
  }

  function onBacklogDrop(e: DragEvent<HTMLElement>) {
    e.preventDefault();
    setDropReady(false);
    const blockId = e.dataTransfer.getData(BLOCK_DRAG_MIME);
    if (blockId) acceptBlockFromGrid(blockId);
  }

  function startRepeatDrag(template: RepeatingTask, e: DragEvent) {
    e.dataTransfer.setData(REPEAT_DRAG_MIME, JSON.stringify(template));
    e.dataTransfer.setData("text/plain", template.title);
    e.dataTransfer.effectAllowed = "copy";
  }

  const openTasks = tasks.filter((t) => t.status === "backlog");
  const listAreas = areas.length ? areas : [];

  return (
    <section
      className={`task-backlog${dropReady ? " is-drop-ready" : ""}`}
      aria-label="Task backlog"
      onDragOver={onBacklogDragOver}
      onDragLeave={() => setDropReady(false)}
      onDrop={onBacklogDrop}
    >
      <div className="day-grid-meta">
        <h2>Backlog</h2>
        <p className="muted">
          Drag onto the grid · drop a placed block here to return it · repeating
          templates stay after placing
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
          <button type="submit">{editingId ? "Save" : "Add"}</button>
          {editingId ? (
            <button type="button" className="secondary" onClick={resetForm}>
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <div className="repeating-panel">
        <h3>Repeating</h3>
        <p className="muted hint-inline">
          Drag a template onto the grid (keeps the template).
        </p>
        <ul className="task-list repeating-list">
          {repeating.map((item) => {
            const area = listAreas.find((a) => a.id === item.areaId);
            return (
              <li
                key={item.id}
                className="task-row is-draggable repeating-row"
                draggable
                onDragStart={(e) => startRepeatDrag(item, e)}
              >
                <span
                  className="swatch"
                  style={{ background: area?.colour ?? "#666" }}
                  aria-hidden
                />
                <div className="task-main">
                  <strong>{item.title}</strong>
                  <span className="muted">
                    {area?.name ?? item.areaId} · {item.durationMin}m
                    {item.deepWork ? " · deep" : ""}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {openTasks.length === 0 ? (
        <p className="muted">
          No open backlog tasks — double-click the grid or drag repeating.
        </p>
      ) : (
        <div className="backlog-by-area">
          {listAreas.map((area) => {
            const columnTasks = openTasks.filter((t) => t.areaId === area.id);
            if (!columnTasks.length) return null;
            return (
              <div key={area.id} className="backlog-area-col">
                <h3>
                  <span
                    className="swatch"
                    style={{ background: area.colour }}
                    aria-hidden
                  />
                  {area.name}
                </h3>
                <ul className="task-list">
                  {columnTasks.map((task) => (
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
                      <div className="task-main">
                        <strong>{task.title}</strong>
                        <span className="muted">
                          {task.durationMin}m · {task.priority}
                          {task.due ? ` · due ${task.due}` : ""}
                          {task.deepWork ? " · deep" : ""}
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
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
