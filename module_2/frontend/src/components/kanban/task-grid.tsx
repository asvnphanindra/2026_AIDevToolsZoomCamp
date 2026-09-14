import { useMemo, useState } from "react";
import { Plus, Inbox } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CARD_STATUSES, STATUS_LABELS, type Card, type CardStatus, type Project } from "@/services/types";
import { readCardId } from "./drag";
import { TaskCard } from "./task-card";

type StatusFilter = CardStatus | "all";

export function TaskGrid({
  cards,
  projects,
  onCreateCard,
  onStatusChange,
  onRename,
  onDelete,
  onUnmap,
}: {
  cards: Card[];
  projects: Project[];
  onCreateCard: (input: { projectId: string; title: string }) => void;
  onStatusChange: (id: string, status: CardStatus) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onUnmap: (id: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState<string>(projects[0]?.id ?? "");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dropActive, setDropActive] = useState(false);

  const activeProjectId = projects.some((p) => p.id === projectId) ? projectId : projects[0]?.id;
  const projectById = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects],
  );

  const visible = cards.filter(
    (card) => statusFilter === "all" || card.status === statusFilter,
  );

  function submit() {
    const trimmed = title.trim();
    if (!trimmed || !activeProjectId) return;
    onCreateCard({ projectId: activeProjectId, title: trimmed });
    setTitle("");
  }

  return (
    <section
      aria-label="Task grid"
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setDropActive(true);
      }}
      onDragLeave={() => setDropActive(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDropActive(false);
        const id = readCardId(event);
        if (id) onUnmap(id);
      }}
      data-testid="task-grid"
      className={cn(
        "flex min-h-0 flex-col rounded-lg border bg-surface transition-colors",
        dropActive ? "border-primary bg-slot-hover/30" : "border-grid-line",
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-grid-line px-4 py-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.14em]">Tasks</h2>
          <p className="text-xs text-muted-foreground">
            {cards.length} card{cards.length === 1 ? "" : "s"} across all projects
          </p>
        </div>
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
          <SelectTrigger
            aria-label="Filter by status"
            className="h-8 w-[8.5rem] rounded-full bg-surface-sunken text-xs"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">
              All statuses
            </SelectItem>
            {CARD_STATUSES.map((status) => (
              <SelectItem key={status} value={status} className="text-xs">
                {STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </header>

      <div className="space-y-2 border-b border-grid-line bg-surface-sunken/60 px-4 py-3">
        <Input
          value={title}
          aria-label="New card title"
          placeholder="New task title"
          disabled={!activeProjectId}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
          }}
          className="h-9 bg-surface text-sm"
        />
        <div className="flex gap-2">
          <Select
            value={activeProjectId ?? ""}
            onValueChange={setProjectId}
            disabled={!activeProjectId}
          >
            <SelectTrigger aria-label="Card project" className="h-9 flex-1 bg-surface text-xs">
              <SelectValue placeholder="Pick a project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id} className="text-xs">
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={submit} disabled={!title.trim() || !activeProjectId} className="h-9">
            <Plus className="size-4" />
            Add card
          </Button>
        </div>
        {projects.length === 0 && (
          <p className="text-xs text-muted-foreground">Create a project first to add cards.</p>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {visible.length === 0 ? (
          <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-grid-line text-center text-muted-foreground">
            <Inbox className="size-5" aria-hidden="true" />
            <p className="text-xs">
              {cards.length === 0
                ? "No cards yet. Add one above."
                : "No cards match this status."}
            </p>
          </div>
        ) : (
          visible.map((card) => (
            <TaskCard
              key={card.id}
              card={card}
              project={projectById.get(card.projectId)}
              onStatusChange={(status) => onStatusChange(card.id, status)}
              onRename={(next) => onRename(card.id, next)}
              onDelete={() => onDelete(card.id)}
            />
          ))
        )}
      </div>

      <footer className="border-t border-grid-line px-4 py-2 text-[0.7rem] text-muted-foreground">
        Drag a card onto the timetable to schedule it. Drag it back here to unschedule.
      </footer>
    </section>
  );
}
