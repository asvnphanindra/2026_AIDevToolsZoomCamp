import { useEffect, useState, type DragEvent } from "react";
import type { SeedArea } from "@/data/fictional-seed";
import { TaskEditor } from "@/components/TaskEditor";
import { BLOCK_DRAG_MIME, type PlacedBlock } from "@/lib/blocks";
import {
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

/** Scheduler “Tasks to Focus” panel (US-C1) + accept placed blocks from grid. */
export function TaskBacklog({
  isDemo,
  areas,
  tasks,
  onTasksChange,
  placedBlocks,
  onPlacedBlocksChange,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [booted, setBooted] = useState(false);
  const [dropReady, setDropReady] = useState(false);

  useEffect(() => {
    if (booted) return;
    // Demo: AuthShell loads/persists Firestore demo/{uid}; never localStorage.
    if (!isDemo && tasks.length === 0) {
      const loaded = loadBacklog();
      if (loaded.length) {
        onTasksChange(loaded);
        writeBacklog(loaded);
      }
    }
    setBooted(true);
  }, [booted, isDemo, onTasksChange, tasks.length]);

  function persist(next: BacklogTask[]) {
    onTasksChange(next);
    if (!isDemo) writeBacklog(next);
  }

  function startEdit(task: BacklogTask) {
    setEditingId(task.id);
  }

  function resetForm() {
    setEditingId(null);
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
        const start = block.start ?? "00:00";
        const end = block.end ?? "00:00";
        const [sh, sm] = start.split(":").map(Number);
        const [eh, em] = end.split(":").map(Number);
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

  const openTasks = tasks.filter((t) => t.status === "backlog");
  const listAreas = areas.length ? areas : [];
  const editing = editingId
    ? tasks.find((t) => t.id === editingId) ?? null
    : null;

  return (
    <section
      className={`task-backlog${dropReady ? " is-drop-ready" : ""}`}
      aria-label="Tasks to Focus"
      onDragOver={onBacklogDragOver}
      onDragLeave={() => setDropReady(false)}
      onDrop={onBacklogDrop}
    >
      <div className="day-grid-meta">
        <h2>Tasks to Focus</h2>
        <p className="muted">
          Same Backlog queue as Planner → Backlog. Unscheduled work stays here
          until you drag it onto the calendar · drop a placed block here to
          return it
        </p>
      </div>

      <TaskEditor
        areas={areas}
        initial={editing}
        submitLabel={editingId ? "Save" : "Add"}
        onCancel={editingId ? resetForm : undefined}
        onSave={({ task }) => {
          if (editingId) {
            persist(
              tasks.map((t) =>
                t.id === editingId ? { ...task, id: editingId } : t,
              ),
            );
          } else {
            persist([{ ...task, id: task.id || `task-${Date.now()}` }, ...tasks]);
          }
          resetForm();
        }}
      />

      {openTasks.length === 0 ? (
        <p className="muted">
          No open tasks to focus — double-click the grid to add one.
        </p>
      ) : (
        <div className="backlog-by-area">
          {listAreas.map((area) => {
            const columnTasks = openTasks
              .filter((t) => t.areaId === area.id)
              .slice()
              .sort((a, b) => Number(Boolean(b.replan)) - Number(Boolean(a.replan)));
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
                      className={`task-row is-draggable${task.replan ? " is-replan" : ""}`}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData(TASK_DRAG_MIME, task.id);
                        e.dataTransfer.setData("text/plain", task.id);
                        e.dataTransfer.effectAllowed = "copyMove";
                      }}
                    >
                      <div className="task-main">
                        <strong>
                          {task.title}
                          {task.replan ? (
                            <span className="replan-badge" title="Needs replan">
                              replan
                            </span>
                          ) : null}
                          {task.goalId ? (
                            <span
                              className="goal-link-badge"
                              title={`From Planner goal ${task.goalId}${
                                task.period ? ` · ${task.period}` : ""
                              }`}
                            >
                              goal
                            </span>
                          ) : null}
                        </strong>
                        <span className="muted">
                          {task.durationMin}m
                          {task.replan ? " left" : ""} · {task.priority}
                          {task.horizon === "week" && task.period
                            ? ` · ${task.period}`
                            : ""}
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
