import { useQuery } from "@tanstack/react-query";
import { CalendarRange, LogOut } from "lucide-react";

import {
  boardQueryOptions,
  useCreateCard,
  useCreateProject,
  useDeleteCard,
  useDeleteProject,
  useMapCard,
  useRenameProject,
  useSetMondayDate,
  useUpdateCard,
} from "@/services/queries";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectsPanel } from "./projects-panel";
import { TaskGrid } from "./task-grid";
import { TimetableGrid } from "./timetable-grid";

type BoardProps = {
  onLogout?: () => void;
};

export function Board({ onLogout }: BoardProps) {
  const { data, isPending, isError, error, refetch } = useQuery(boardQueryOptions);

  const createProject = useCreateProject();
  const renameProject = useRenameProject();
  const deleteProject = useDeleteProject();
  const createCard = useCreateCard();
  const updateCard = useUpdateCard();
  const deleteCard = useDeleteCard();
  const mapCard = useMapCard();
  const setMondayDate = useSetMondayDate();

  const projects = data?.projects ?? [];
  const cards = data?.cards ?? [];
  const unscheduled = cards.filter((card) => card.slot === null);
  const scheduled = cards.filter((card) => card.slot !== null);

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-background">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-grid-line bg-surface px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <CalendarRange className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-base font-bold leading-tight">Mini Kanban</h1>
            <p className="text-xs text-muted-foreground">
              {scheduled.length} scheduled · {unscheduled.length} waiting
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ProjectsPanel
            projects={projects}
            cards={cards}
            onCreate={(name) => createProject.mutate({ name })}
            onRename={(id, name) => renameProject.mutate({ id, name })}
            onDelete={(id) => deleteProject.mutate({ id })}
          />
          {onLogout ? (
            <Button type="button" variant="outline" size="sm" onClick={onLogout}>
              <LogOut className="size-4" aria-hidden="true" />
              Log out
            </Button>
          ) : null}
        </div>
      </header>

      {isPending ? (
        <div className="grid min-h-0 flex-1 gap-4 p-4 lg:grid-cols-[minmax(0,1.9fr)_minmax(20rem,1fr)]">
          <Skeleton className="h-full w-full rounded-lg" />
          <Skeleton className="h-full w-full rounded-lg" />
        </div>
      ) : isError ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Could not load the board from the API.
            {error instanceof Error ? ` ${error.message}` : ""}
          </p>
          <Button type="button" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 gap-4 overflow-auto p-4 lg:grid-cols-[minmax(0,1.9fr)_minmax(20rem,1fr)] lg:overflow-hidden">
          <TimetableGrid
            cards={scheduled}
            projects={projects}
            mondayDate={data?.settings.mondayDate ?? null}
            onMondayDateChange={(mondayDate) => setMondayDate.mutate({ mondayDate })}
            onMap={(id, day, hour) => mapCard.mutate({ id, slot: { day, hour } })}
            onStatusChange={(id, status) => updateCard.mutate({ id, status })}
            onRename={(id, title) => updateCard.mutate({ id, title })}
            onDelete={(id) => deleteCard.mutate({ id })}
          />
          <TaskGrid
            cards={unscheduled}
            projects={projects}
            onCreateCard={(input) => createCard.mutate(input)}
            onStatusChange={(id, status) => updateCard.mutate({ id, status })}
            onRename={(id, title) => updateCard.mutate({ id, title })}
            onDelete={(id) => deleteCard.mutate({ id })}
            onUnmap={(id) => mapCard.mutate({ id, slot: null })}
          />
        </div>
      )}

      <footer className="border-t border-grid-line bg-surface px-5 py-2 text-[0.7rem] leading-snug text-muted-foreground">
        <p>
          © {new Date().getFullYear()} Mini Kanban. All rights reserved. This
          weekly timetable + task-grid planning concept, design, and software are
          proprietary. Others may not copy, reuse, or build a substantially similar
          working planning product without prior written permission.
        </p>
      </footer>
    </main>
  );
}
