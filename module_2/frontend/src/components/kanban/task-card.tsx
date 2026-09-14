import { useEffect, useRef, useState } from "react";
import { GripVertical, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Card, CardStatus, Project } from "@/services/types";
import { endCardDrag, startCardDrag } from "./drag";
import { StatusSelect } from "./status-select";

export function TaskCard({
  card,
  project,
  onStatusChange,
  onRename,
  onDelete,
  compact = false,
}: {
  card: Card;
  project?: Project;
  onStatusChange: (status: CardStatus) => void;
  onRename: (title: string) => void;
  onDelete: () => void;
  compact?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(card.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function commit() {
    const trimmed = draft.trim();
    setEditing(false);
    if (trimmed && trimmed !== card.title) onRename(trimmed);
    else setDraft(card.title);
  }

  return (
    <article
      draggable={!editing}
      onDragStart={(event) => startCardDrag(event, card.id)}
      onDragEnd={endCardDrag}
      data-testid={`card-${card.id}`}
      aria-label={card.title}
      className={cn(
        "group accent-tint relative overflow-hidden rounded-md border border-grid-line shadow-card transition-shadow",
        "hover:shadow-lift active:cursor-grabbing",
        editing ? "cursor-text" : "cursor-grab",
        project ? `project-accent-${project.colorIndex}` : undefined,
        compact ? "px-2 py-1.5" : "p-3 pl-4",
      )}
    >
      <span className="accent-bar absolute inset-y-0 left-0 w-1" aria-hidden="true" />

      {compact ? (
        <div className="pl-1.5">
          <p className="truncate text-[0.7rem] font-semibold leading-tight">{card.title}</p>
          <p className="accent-text truncate text-[0.6rem] font-medium uppercase tracking-wide">
            {project?.name ?? "No project"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-start gap-1.5">
            <GripVertical
              className="mt-0.5 size-4 shrink-0 text-muted-foreground/60"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              {editing ? (
                <Input
                  ref={inputRef}
                  value={draft}
                  aria-label="Card title"
                  onChange={(event) => setDraft(event.target.value)}
                  onBlur={commit}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") commit();
                    if (event.key === "Escape") {
                      setDraft(card.title);
                      setEditing(false);
                    }
                  }}
                  className="h-7 text-sm"
                />
              ) : (
                <p className="text-sm font-semibold leading-snug">{card.title}</p>
              )}
              <p className="accent-text mt-0.5 text-[0.65rem] font-semibold uppercase tracking-wider">
                {project?.name ?? "No project"}
              </p>
            </div>
            <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label={`Edit ${card.title}`}
                onClick={() => setEditing(true)}
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-destructive hover:text-destructive"
                aria-label={`Delete ${card.title}`}
                onClick={onDelete}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
          <StatusSelect status={card.status} onChange={onStatusChange} />
        </div>
      )}
    </article>
  );
}
