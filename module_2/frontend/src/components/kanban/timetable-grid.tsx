import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  DAY_NAMES,
  HOURS,
  slotKey,
  type Card,
  type CardStatus,
  type Project,
} from "@/services/types";
import { readCardId } from "./drag";
import { TaskCard } from "./task-card";

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

/** Day labels derived from the optional Monday date. Display only. */
export function dayDates(mondayDate: string | null): (string | null)[] {
  if (!mondayDate) return DAY_NAMES.map(() => null);
  const base = new Date(`${mondayDate}T00:00:00`);
  if (Number.isNaN(base.getTime())) return DAY_NAMES.map(() => null);
  return DAY_NAMES.map((_, index) => {
    const date = new Date(base);
    date.setDate(base.getDate() + index);
    return date.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
  });
}

export function TimetableGrid({
  cards,
  projects,
  mondayDate,
  onMondayDateChange,
  onMap,
  onStatusChange,
  onRename,
  onDelete,
}: {
  cards: Card[];
  projects: Project[];
  mondayDate: string | null;
  onMondayDateChange: (value: string | null) => void;
  onMap: (id: string, day: number, hour: number) => void;
  onStatusChange: (id: string, status: CardStatus) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  const bySlot = useMemo(() => {
    const map = new Map<string, Card>();
    for (const card of cards) if (card.slot) map.set(slotKey(card.slot), card);
    return map;
  }, [cards]);

  const projectById = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects],
  );
  const dates = dayDates(mondayDate);

  return (
    <section
      aria-label="Timetable"
      className="flex min-h-0 flex-col rounded-lg border border-grid-line bg-surface"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-grid-line px-4 py-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.14em]">Week timetable</h2>
          <p className="text-xs text-muted-foreground">
            Monday to Sunday, {formatHour(HOURS[0])}–{formatHour(HOURS[HOURS.length - 1])}
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Monday date
          <Input
            type="date"
            aria-label="Monday date"
            value={mondayDate ?? ""}
            onChange={(event) => onMondayDateChange(event.target.value || null)}
            className="h-8 w-[9.5rem] bg-surface-sunken text-xs"
          />
        </label>
      </header>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="grid min-w-[46rem] grid-cols-[4.5rem_repeat(7,minmax(6.5rem,1fr))]">
          <div className="sticky top-0 z-20 border-b border-r border-grid-line bg-surface-sunken px-2 py-2 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
            Time
          </div>
          {DAY_NAMES.map((day, index) => (
            <div
              key={day}
              className="sticky top-0 z-10 border-b border-r border-grid-line bg-surface-sunken px-2 py-2 text-center"
            >
              <p className="text-[0.7rem] font-bold uppercase tracking-wider">{day.slice(0, 3)}</p>
              <p className="text-[0.65rem] text-muted-foreground">{dates[index] ?? "—"}</p>
            </div>
          ))}

          {HOURS.map((hour) => (
            <div key={hour} className="contents">
              <div className="border-b border-r border-grid-line bg-surface-sunken px-2 py-2 text-right text-[0.7rem] font-medium tabular-nums text-muted-foreground">
                {formatHour(hour)}
              </div>
              {DAY_NAMES.map((day, dayIndex) => {
                const key = `${dayIndex}-${hour}`;
                const card = bySlot.get(key);
                return (
                  <div
                    key={key}
                    data-testid={`slot-${key}`}
                    aria-label={`${day} ${formatHour(hour)}`}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      setHovered(key);
                    }}
                    onDragLeave={() => setHovered((current) => (current === key ? null : current))}
                    onDrop={(event) => {
                      event.preventDefault();
                      setHovered(null);
                      const id = readCardId(event);
                      if (id) onMap(id, dayIndex, hour);
                    }}
                    className={cn(
                      "min-h-12 border-b border-r border-grid-line bg-slot p-1 transition-colors",
                      hovered === key && "bg-slot-hover",
                    )}
                  >
                    {card && (
                      <TaskCard
                        compact
                        card={card}
                        project={projectById.get(card.projectId)}
                        onStatusChange={(status) => onStatusChange(card.id, status)}
                        onRename={(title) => onRename(card.id, title)}
                        onDelete={() => onDelete(card.id)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
