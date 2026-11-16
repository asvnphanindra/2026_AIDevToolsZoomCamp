import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  BlockActionSheet,
  applyBlockSheetAction,
  type BlockSheetAction,
} from "@/components/BlockActionSheet";
import { BottomSheet } from "@/components/BottomSheet";
import { CheckInPrompt } from "@/components/CheckInPrompt";
import type {
  SeedArea,
  SeedBand,
  SeedRoutine,
  SeedSchedule,
} from "@/data/fictional-seed";
import {
  durationMinutes,
  findConflicts,
  type PlacedBlock,
  type TimedItem,
} from "@/lib/blocks";
import {
  endedWithinMinutes,
  isBlockEnded,
  outcomeLabel,
  replanUnfinishedTask,
  withCheckIn,
  type BlockCheckIn,
  type CheckInOutcome,
} from "@/lib/checkin";
import {
  buildDayGrid,
  type GridItem,
} from "@/lib/day-grid";
import { dayTypeForDay, type DayTypeLike } from "@/lib/schedule";
import { type BacklogTask } from "@/lib/tasks";
import {
  dateFromKey,
  dateKeyInTz,
  DEFAULT_TZ,
  formatDayLabel,
  minutesOf,
  shiftDateKey,
} from "@/lib/time";

type Props = {
  isDemo: boolean;
  areas: SeedArea[];
  timezone?: string;
  /** Jump agenda to this YYYY-MM-DD (calendar Open day). */
  anchorDate?: string;
  tasks: BacklogTask[];
  onTasksChange: (tasks: BacklogTask[]) => void;
  placedBlocks: PlacedBlock[];
  onPlacedBlocksChange: (blocks: PlacedBlock[]) => void;
  bands?: SeedBand[];
  routines?: SeedRoutine[];
  schedules?: SeedSchedule[];
  dayTypes?: DayTypeLike[];
  checkIns: Record<string, BlockCheckIn>;
  onCheckInsChange: (next: Record<string, BlockCheckIn>) => void;
};

function rangesClash(
  a: { start: string; end: string },
  b: { start: string; end: string },
): boolean {
  return minutesOf(a.start) < minutesOf(b.end) && minutesOf(a.end) > minutesOf(b.start);
}

const SWIPE_MIN = 48;
const RECENT_END_MIN = 15;

/** Single-day phone agenda with swipe + calm check-ins. */
export function DayAgenda({
  isDemo,
  areas,
  timezone = DEFAULT_TZ,
  anchorDate,
  tasks,
  onTasksChange,
  placedBlocks,
  onPlacedBlocksChange,
  bands,
  routines,
  schedules,
  dayTypes,
  checkIns,
  onCheckInsChange,
}: Props) {
  const todayKey = dateKeyInTz(new Date(), timezone);
  const [dayKey, setDayKey] = useState(anchorDate || todayKey);

  useEffect(() => {
    if (anchorDate) setDayKey(anchorDate);
  }, [anchorDate]);
  const [clock, setClock] = useState(() => Date.now());
  const [sheetItem, setSheetItem] = useState<GridItem | null>(null);
  const [checkInTarget, setCheckInTarget] = useState<GridItem | null>(null);
  const [checkInListOpen, setCheckInListOpen] = useState(false);
  const [overlap, setOverlap] = useState<{
    candidate: PlacedBlock;
    conflicts: TimedItem[];
  } | null>(null);
  const [snoozedIds, setSnoozedIds] = useState<Set<string>>(() => new Set());
  const pointerRef = useRef<{ x: number; y: number; id: number } | null>(null);
  const longPressRef = useRef<number | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setClock(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const model = useMemo(
    () =>
      buildDayGrid({
        isDemo,
        areas,
        timezone,
        now: dateFromKey(dayKey),
        bands,
        routines,
        schedules,
        dayTypes,
        placedBlocks,
      }),
    [
      isDemo,
      areas,
      timezone,
      dayKey,
      bands,
      routines,
      schedules,
      dayTypes,
      placedBlocks,
    ],
  );

  const items = useMemo(
    () =>
      model.items
        .filter((i) => i.date === dayKey)
        .slice()
        .sort((a, b) => minutesOf(a.start) - minutesOf(b.start)),
    [model.items, dayKey],
  );

  const clashIds = useMemo(() => {
    const ids = new Set<string>();
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i]!;
        const b = items[j]!;
        if (!rangesClash(a, b)) continue;
        ids.add(a.id);
        ids.add(b.id);
      }
    }
    return ids;
  }, [items]);

  const dueCheckIns = useMemo(() => {
    const now = new Date(clock);
    return model.items
      .filter(
        (item) =>
          item.kind === "block" &&
          !checkIns[item.id] &&
          !snoozedIds.has(item.id) &&
          isBlockEnded(item.date, item.end, model.timezone, now),
      )
      .sort((a, b) =>
        a.date === b.date
          ? minutesOf(a.end) - minutesOf(b.end)
          : a.date.localeCompare(b.date),
      );
  }, [model.items, model.timezone, checkIns, snoozedIds, clock]);

  useEffect(() => {
    if (checkInTarget || checkInListOpen || sheetItem) return;
    const now = new Date(clock);
    const recent = dueCheckIns.find((item) =>
      endedWithinMinutes(
        item.date,
        item.end,
        RECENT_END_MIN,
        model.timezone,
        now,
      ),
    );
    if (recent) setCheckInTarget(recent);
  }, [
    dueCheckIns,
    checkInTarget,
    checkInListOpen,
    sheetItem,
    clock,
    model.timezone,
  ]);

  const dayType = dayTypeForDay(dayKey, 0, model.dayTypes);
  const nowPartsLabel = useMemo(() => {
    const now = new Date(clock);
    if (dateKeyInTz(now, timezone) !== dayKey) return null;
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: timezone,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(now);
  }, [clock, dayKey, timezone]);

  function go(delta: number) {
    setDayKey((k) => shiftDateKey(k, delta));
  }

  function returnPlacedToBacklog(item: GridItem) {
    const existing = placedBlocks.find((b) => b.id === item.id);
    if (!existing) return;
    onPlacedBlocksChange(placedBlocks.filter((b) => b.id !== item.id));
    if (existing.taskId) {
      const hit = tasks.find((t) => t.id === existing.taskId);
      if (hit) {
        onTasksChange(
          tasks.map((t) =>
            t.id === existing.taskId ? { ...t, status: "backlog" } : t,
          ),
        );
        return;
      }
    }
    const taskId = existing.taskId || `task-return-${Date.now()}`;
    onTasksChange([
      {
        id: taskId,
        title: existing.title,
        areaId: existing.areaId,
        durationMin: Math.max(
          15,
          minutesOf(existing.end) - minutesOf(existing.start),
        ),
        priority: "med",
        status: "backlog",
        horizon: "day",
        deepWork: existing.deepWork,
      },
      ...tasks.filter((t) => t.id !== taskId),
    ]);
  }

  function openClashResolve(item: GridItem) {
    const candidate =
      placedBlocks.find((b) => b.id === item.id) ??
      placedBlocks.find(
        (b) => b.date === item.date && rangesClash(b, item) && b.id !== item.id,
      );
    if (!candidate) return;
    const universe: TimedItem[] = model.items
      .filter((i) => i.id !== candidate.id)
      .map((i) => ({
        id: i.id,
        date: i.date,
        start: i.start,
        end: i.end,
        title: i.title,
        kind: i.kind,
      }));
    const conflicts = findConflicts(candidate, universe);
    if (!conflicts.length) return;
    setSheetItem(null);
    setOverlap({ candidate, conflicts });
  }

  function resolveOverlap(action: "shorten-mine" | "shorten-other" | "cancel") {
    if (!overlap) return;
    if (action === "cancel") {
      setOverlap(null);
      return;
    }
    let candidate = { ...overlap.candidate };
    const first = overlap.conflicts[0]!;
    if (action === "shorten-mine") {
      if (minutesOf(first.start) <= minutesOf(candidate.start)) {
        setOverlap(null);
        return;
      }
      candidate = { ...candidate, end: first.start };
      if (durationMinutes(candidate.start, candidate.end) < 15) {
        setOverlap(null);
        return;
      }
      onPlacedBlocksChange(
        placedBlocks.map((b) => (b.id === candidate.id ? candidate : b)),
      );
      setOverlap(null);
      return;
    }
    const otherPlaced = placedBlocks.find((b) => b.id === first.id);
    if (!otherPlaced) {
      if (minutesOf(first.start) > minutesOf(candidate.start)) {
        candidate = { ...candidate, end: first.start };
        if (durationMinutes(candidate.start, candidate.end) >= 15) {
          onPlacedBlocksChange(
            placedBlocks.map((b) => (b.id === candidate.id ? candidate : b)),
          );
        }
      }
      setOverlap(null);
      return;
    }
    if (durationMinutes(otherPlaced.start, candidate.start) < 15) {
      setOverlap(null);
      return;
    }
    onPlacedBlocksChange(
      placedBlocks.map((b) =>
        b.id === first.id ? { ...b, end: candidate.start } : b,
      ),
    );
    setOverlap(null);
  }

  function onSheetAction(action: BlockSheetAction) {
    if (!sheetItem) return;
    if (action.type === "resolve-clash") {
      openClashResolve(sheetItem);
      return;
    }
    if (action.type === "check-in") {
      setCheckInTarget(sheetItem);
      setSheetItem(null);
      return;
    }
    if (action.type === "unschedule") {
      returnPlacedToBacklog(sheetItem);
      setSheetItem(null);
      return;
    }
    const next = applyBlockSheetAction(sheetItem, action, placedBlocks);
    if (next) onPlacedBlocksChange(next);
    setSheetItem(null);
  }

  function submitCheckIn(outcome: CheckInOutcome, remainingMin?: number) {
    if (!checkInTarget) return;
    const entry: BlockCheckIn = {
      blockId: checkInTarget.id,
      outcome,
      remainingMin: outcome === "partly" ? remainingMin : undefined,
      checkedAt: new Date().toISOString(),
    };
    onCheckInsChange(withCheckIn(checkIns, entry));

    if (
      (outcome === "partly" || outcome === "not-done") &&
      checkInTarget.placed
    ) {
      const existing = placedBlocks.find((b) => b.id === checkInTarget.id);
      if (existing) {
        const nextTasks = replanUnfinishedTask(
          tasks,
          {
            taskId: existing.taskId,
            title: existing.title,
            areaId: existing.areaId,
            start: existing.start,
            end: existing.end,
            deepWork: existing.deepWork,
          },
          outcome,
          remainingMin,
        );
        if (nextTasks) onTasksChange(nextTasks);
        onPlacedBlocksChange(
          placedBlocks.filter((b) => b.id !== existing.id),
        );
      }
    }
    setCheckInTarget(null);
  }

  function snoozeCheckIn() {
    if (!checkInTarget) return;
    setSnoozedIds((prev) => new Set(prev).add(checkInTarget.id));
    setCheckInTarget(null);
  }

  function clearLongPress() {
    if (longPressRef.current != null) {
      window.clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  }

  function onPointerDown(item: GridItem, e: ReactPointerEvent) {
    if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
    pointerRef.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    clearLongPress();
    longPressRef.current = window.setTimeout(() => {
      setSheetItem(item);
      pointerRef.current = null;
    }, 420);
  }

  function onPointerUp(item: GridItem, e: ReactPointerEvent) {
    clearLongPress();
    const start = pointerRef.current;
    pointerRef.current = null;
    if (!start || start.id !== e.pointerId) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.hypot(dx, dy) < 12) {
      if (e.pointerType === "touch" || e.pointerType === "pen") {
        setSheetItem(item);
      }
    }
  }

  function onSwipePointerDown(e: ReactPointerEvent) {
    if ((e.target as HTMLElement).closest(".agenda-item")) return;
    pointerRef.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
  }

  function onSwipePointerUp(e: ReactPointerEvent) {
    const start = pointerRef.current;
    pointerRef.current = null;
    if (!start || start.id !== e.pointerId) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < Math.abs(dy)) return;
    go(dx < 0 ? 1 : -1);
  }

  return (
    <section className="day-agenda" aria-label="Day agenda">
      <div className="day-agenda-toolbar">
        <button type="button" className="secondary tap-target" onClick={() => go(-1)}>
          Prev
        </button>
        <button
          type="button"
          className="secondary tap-target"
          onClick={() => setDayKey(todayKey)}
        >
          Today
        </button>
        <button type="button" className="tap-target" onClick={() => go(1)}>
          Next
        </button>
      </div>

      <header className="day-agenda-header">
        <h2>{formatDayLabel(dayKey, timezone)}</h2>
        <p className="muted">
          {dayKey === todayKey ? "Today" : dayKey}
          {dayType ? ` · ${dayType.label}` : ""}
          {nowPartsLabel ? ` · now ${nowPartsLabel}` : ""}
        </p>
        {dueCheckIns.length > 0 ? (
          <button
            type="button"
            className="checkin-chip tap-target"
            onClick={() => setCheckInListOpen(true)}
          >
            {dueCheckIns.length} to check in
          </button>
        ) : null}
      </header>

      <div
        className="day-agenda-list"
        onPointerDown={onSwipePointerDown}
        onPointerUp={onSwipePointerUp}
        onPointerCancel={() => {
          pointerRef.current = null;
        }}
      >
        {items.length === 0 ? (
          <p className="muted">Nothing scheduled this day.</p>
        ) : (
          items.map((item) => {
            const checkIn = checkIns[item.id];
            const clashing = clashIds.has(item.id);
            return (
              <article
                key={item.id}
                className={`agenda-item kind-${item.kind}${item.placed ? " is-placed" : ""}${checkIn ? ` checkin-${checkIn.outcome}` : ""}${clashing ? " is-clash" : ""}`}
                style={{ borderLeftColor: item.colour }}
                onPointerDown={(e) => onPointerDown(item, e)}
                onPointerUp={(e) => onPointerUp(item, e)}
                onPointerCancel={clearLongPress}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setSheetItem(item);
                }}
              >
                <div className="agenda-item-time">
                  {item.start}–{item.end}
                </div>
                <div className="agenda-item-body">
                  <strong>{item.title}</strong>
                  <span className="muted">
                    {item.kind}
                    {item.deepWork ? " · deep" : ""}
                    {checkIn ? ` · ${outcomeLabel(checkIn.outcome)}` : ""}
                  </span>
                </div>
                {clashing ? (
                  <button
                    type="button"
                    className="clash-badge tap-target"
                    aria-label={`Resolve clash for ${item.title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      openClashResolve(item);
                    }}
                  >
                    ⚠
                  </button>
                ) : null}
              </article>
            );
          })
        )}
      </div>

      {overlap ? (
        <div className="overlap-banner" role="alertdialog">
          <p>
            Overlap with{" "}
            {overlap.conflicts
              .map((c) => `${c.title} (${c.start}–${c.end})`)
              .join("; ")}
            .
          </p>
          <div className="actions">
            <button type="button" onClick={() => resolveOverlap("shorten-mine")}>
              Shorten this
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => resolveOverlap("shorten-other")}
            >
              Shorten other
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => resolveOverlap("cancel")}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <BlockActionSheet
        item={sheetItem}
        open={Boolean(sheetItem)}
        clashing={sheetItem ? clashIds.has(sheetItem.id) : false}
        onClose={() => setSheetItem(null)}
        onAction={onSheetAction}
      />

      <BottomSheet
        open={checkInListOpen}
        title="Check-ins"
        onClose={() => setCheckInListOpen(false)}
      >
        {dueCheckIns.length === 0 ? (
          <p className="muted">Nothing pending.</p>
        ) : (
          <ul className="checkin-due-list">
            {dueCheckIns.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="tap-target checkin-due-row"
                  onClick={() => {
                    setCheckInListOpen(false);
                    setCheckInTarget(item);
                  }}
                >
                  <strong>{item.title}</strong>
                  <span className="muted">
                    {item.date} · {item.start}–{item.end}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </BottomSheet>

      {checkInTarget ? (
        <BottomSheet
          open
          title="Check in"
          onClose={snoozeCheckIn}
        >
          <CheckInPrompt
            title={checkInTarget.title}
            start={checkInTarget.start}
            end={checkInTarget.end}
            onSubmit={submitCheckIn}
            onLater={snoozeCheckIn}
          />
        </BottomSheet>
      ) : null}
    </section>
  );
}
