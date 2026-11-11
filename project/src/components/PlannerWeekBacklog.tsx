import { FocusPanel } from "@/components/FocusPanel";
import type { SeedArea } from "@/data/fictional-seed";
import type { FocusItem } from "@/lib/focus";
import type { BacklogTask } from "@/lib/tasks";

type Props = {
  areas: SeedArea[];
  area: SeedArea | undefined;
  period: string;
  tasks: BacklogTask[];
  onTasksChange: (tasks: BacklogTask[]) => void;
  focusItems: FocusItem[];
  onFocusItemsChange: (items: FocusItem[]) => void;
  onOpenScheduler?: () => void;
};

/** Weekly Backlog under the Planner Gantt (owns Focus / standing items). */
export function PlannerWeekBacklog({
  areas,
  area,
  period,
  tasks,
  onTasksChange,
  focusItems,
  onFocusItemsChange,
  onOpenScheduler,
}: Props) {
  const weekTasks = tasks
    .filter(
      (t) =>
        t.status === "backlog" &&
        area != null &&
        t.areaId === area.id &&
        (t.period === period || (!t.period && t.horizon === "week")),
    )
    .slice()
    .sort((a, b) => Number(Boolean(b.replan)) - Number(Boolean(a.replan)));

  function remove(id: string) {
    if (!window.confirm("Remove this item from the weekly backlog?")) return;
    onTasksChange(tasks.filter((t) => t.id !== id));
  }

  return (
    <section className="planner-week-backlog" aria-label="Weekly backlog">
      <div className="day-grid-meta">
        <h3>Backlog</h3>
        <p className="muted">
          This week’s planning list for{" "}
          {area ? <strong>{area.name}</strong> : "the selected area"} ({period}
          ). Add from Goals above; standing focus lives here (no separate Focus
          page). Place while working in Scheduler → Focus (
          <strong>Tasks to Focus</strong>).
        </p>
      </div>

      {!area ? (
        <p className="muted">Create a life area above first.</p>
      ) : weekTasks.length === 0 ? (
        <p className="muted">
          No weekly backlog items for {area.name} — use{" "}
          <strong>→ This week</strong> on a Gantt goal.
        </p>
      ) : (
        <ul className="task-list planner-week-backlog-list">
          {weekTasks.map((task) => (
            <li
              key={task.id}
              className={`task-row${task.replan ? " is-replan" : ""}`}
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
                    <span className="goal-link-badge" title="From Gantt goal">
                      goal
                    </span>
                  ) : null}
                </strong>
                <span className="muted">
                  {task.durationMin}m · {task.priority}
                  {task.due ? ` · due ${task.due}` : ""}
                  {task.deepWork ? " · deep" : ""}
                </span>
              </div>
              <div className="task-actions">
                {onOpenScheduler ? (
                  <button
                    type="button"
                    className="secondary"
                    onClick={onOpenScheduler}
                    title="Open Scheduler Focus layer to place"
                  >
                    Schedule
                  </button>
                ) : null}
                <button
                  type="button"
                  className="secondary"
                  onClick={() => remove(task.id)}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <FocusPanel
        areas={areas}
        items={focusItems}
        onItemsChange={onFocusItemsChange}
        embedded
      />
    </section>
  );
}
