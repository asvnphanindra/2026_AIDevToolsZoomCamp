import { useState } from "react";
import { Check, FolderPlus, Pencil, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Card, Project } from "@/services/types";

export function ProjectsPanel({
  projects,
  cards,
  onCreate,
  onRename,
  onDelete,
}: {
  projects: Project[];
  cards: Card[];
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  function add() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setName("");
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <FolderPlus className="size-4" />
          Projects ({projects.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Projects</DialogTitle>
          <DialogDescription>
            Cards belong to a project. Deleting a project deletes its cards.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            value={name}
            aria-label="New project name"
            placeholder="Project name"
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") add();
            }}
            className="h-9"
          />
          <Button onClick={add} disabled={!name.trim()} className="h-9">
            Add
          </Button>
        </div>

        <ul className="space-y-1.5">
          {projects.map((project) => {
            const count = cards.filter((card) => card.projectId === project.id).length;
            const editing = editingId === project.id;
            return (
              <li
                key={project.id}
                className={`project-accent-${project.colorIndex} accent-tint flex items-center gap-2 rounded-md border border-grid-line px-2.5 py-2`}
              >
                <span className="accent-dot size-2.5 shrink-0 rounded-full" aria-hidden="true" />
                {editing ? (
                  <>
                    <Input
                      value={draft}
                      aria-label={`Rename ${project.name}`}
                      autoFocus
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          if (draft.trim()) onRename(project.id, draft.trim());
                          setEditingId(null);
                        }
                        if (event.key === "Escape") setEditingId(null);
                      }}
                      className="h-7 flex-1 text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      aria-label="Save name"
                      onClick={() => {
                        if (draft.trim()) onRename(project.id, draft.trim());
                        setEditingId(null);
                      }}
                    >
                      <Check className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      aria-label="Cancel rename"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 truncate text-sm font-medium">{project.name}</span>
                    <span className="text-[0.7rem] text-muted-foreground">{count}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      aria-label={`Rename ${project.name}`}
                      onClick={() => {
                        setEditingId(project.id);
                        setDraft(project.name);
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive hover:text-destructive"
                      aria-label={`Delete ${project.name}`}
                      onClick={() => onDelete(project.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </>
                )}
              </li>
            );
          })}
          {projects.length === 0 && (
            <li className="rounded-md border border-dashed border-grid-line px-3 py-6 text-center text-xs text-muted-foreground">
              No projects yet.
            </li>
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
