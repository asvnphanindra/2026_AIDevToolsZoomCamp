import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type MouseEvent,
} from "react";
import {
  BlockContextMenu,
  type BlockMenuAction,
} from "@/components/BlockContextMenu";
import { CheckInPrompt } from "@/components/CheckInPrompt";
import { NowIndicator } from "@/components/NowIndicator";
import { fictionalSeed, type SeedArea } from "@/data/fictional-seed";
import {
  addMinutes,
  BLOCK_DRAG_MIME,
  durationMinutes,
  findConflicts,
  snapMinutes,
  type PlacedBlock,
  type TimedItem,
} from "@/lib/blocks";
import {
  isBlockEnded,
  loadCheckIns,
  outcomeLabel,
  replanUnfinishedTask,
  upsertCheckIn,
  type BlockCheckIn,
  type CheckInOutcome,
} from "@/lib/checkin";
import { TASK_DRAG_MIME, type BacklogTask } from "@/lib/tasks";
import {
  bandColour,
  buildDayGrid,
  itemPlacement,
  slotBandLevel,
  type GridItem,
} from "@/lib/day-grid";
import type { FocusItem } from "@/lib/focus";
import { dayTypeForOffset } from "@/lib/schedule";
import {
  layerStateForMode,
  SCHEDULER_LAYER_MODE_LABELS,
  SCHEDULER_LAYER_MODES,
  type SchedulerLayerId,
  type SchedulerLayerMode,
} from "@/lib/scheduler-layers";
import {
  buildHalfHourSlots,
  formatDayLabel,
  formatHhmm,
  minutesOf,
  weekdaySun0,
} from "@/lib/time";

type Props = {
  isDemo: boolean;
  areas: SeedArea[];
  timezone?: string;
  tasks: BacklogTask[];
  onTasksChange: (tasks: BacklogTask[]) => void;
  placedBlocks: PlacedBlock[];
  onPlacedBlocksChange: (blocks: PlacedBlock[]) => void;
  /** Standing focus items painted on today→+2d when Focus layer is on. */
  focusItems?: FocusItem[];
  /** Combined or a single exclusive layer (controlled by AuthShell). */
  layerMode: SchedulerLayerMode;
  onLayerModeChange: (mode: SchedulerLayerMode) => void;
};

type OverlapPrompt = {
  candidate: PlacedBlock;
  conflicts: TimedItem[];
  mode: "create" | "update";
};

type CtxMenu = { x: number; y: number; item: GridItem };

const HOVER_MARK_START = "05:00";
const HOVER_MARK_END = "22:00";
const ROW_PX = 1.35;

function yToStart(
  clientY: number,
  el: HTMLElement,
  startHour: number,
  endHour: number,
): string {
  const rect = el.getBoundingClientRect();
  const ratio = (clientY - rect.top) / rect.height;
  const windowStart = startHour * 60;
  const windowEnd = endHour * 60;
  const mins = snapMinutes(
    windowStart + ratio * (windowEnd - windowStart),
    startHour,
    endHour,
  );
  return formatHhmm(mins);
}

function layerForItem(item: GridItem): SchedulerLayerId | null {
  if (item.kind === "routine" || item.kind === "schedule") return "recurring";
  if (item.kind === "block") return "scheduled";
  return null;
}

function rangesClash(
  a: { start: string; end: string },
  b: { start: string; end: string },
): boolean {
  return minutesOf(a.start) < minutesOf(b.end) && minutesOf(a.end) > minutesOf(b.start);
}

/** Week grid + stacked calendar layers + US-C2 drag/drop. */
export function DayGrid({
  isDemo,
  areas,
  timezone,
  tasks,
  onTasksChange,
  placedBlocks,
  onPlacedBlocksChange,
  focusItems = [],
  layerMode,
  onLayerModeChange,
}: Props) {
  const [overlap, setOverlap] = useState<OverlapPrompt | null>(null);
  const [ctx, setCtx] = useState<CtxMenu | null>(null);
  const [checkIns, setCheckIns] = useState<Record<string, BlockCheckIn>>(() =>
    typeof localStorage === "undefined" ? {} : loadCheckIns(),
  );
  const [checkInTarget, setCheckInTarget] = useState<GridItem | null>(null);
  const [snoozedIds, setSnoozedIds] = useState<Set<string>>(() => new Set());
  const [clock, setClock] = useState(() => Date.now());
  const [dropHl, setDropHl] = useState<{ dayKey: string; slot: string } | null>(
    null,
  );
  const layers = layerStateForMode(layerMode);

  const model = useMemo(
    () =>
      buildDayGrid({
        isDemo,
        areas,
        timezone,
        dayTypes: fictionalSeed.dayTypes,
        placedBlocks,
      }),
    [isDemo, areas, timezone, placedBlocks],
  );
  const slots = useMemo(
    () => buildHalfHourSlots(model.startHour, model.endHour),
    [model.startHour, model.endHour],
  );
  const warnIds = useMemo(
    () => new Set(model.warnings.map((w) => w.blockId)),
    [model.warnings],
  );

  const visibleItems = useMemo(
    () =>
      model.items.filter((item) => {
        const layer = layerForItem(item);
        return layer ? layers[layer] : true;
      }),
    [model.items, layers],
  );

  const clashIds = useMemo(() => {
    const ids = new Set<string>();
    const byDay = new Map<string, GridItem[]>();
    for (const item of visibleItems) {
      const list = byDay.get(item.date) ?? [];
      list.push(item);
      byDay.set(item.date, list);
    }
    for (const list of byDay.values()) {
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i]!;
          const b = list[j]!;
          if (!rangesClash(a, b)) continue;
          ids.add(a.id);
          ids.add(b.id);
        }
      }
    }
    return ids;
  }, [visibleItems]);

  const focusDayKeys = useMemo(() => {
    if (!layers.focus) return new Set<string>();
    const keys = new Set<string>();
    for (let offset = 0; offset <= 2; offset++) {
      const key = model.dayKeys[model.todayIndex + offset];
      if (key) keys.add(key);
    }
    return keys;
  }, [layers.focus, model.dayKeys, model.todayIndex]);

  const orderedFocus = useMemo(() => {
    const areaOrder = new Map(areas.map((a) => [a.id, a.order]));
    return [...focusItems].sort((a, b) => {
      const ao = areaOrder.get(a.areaId) ?? 0;
      const bo = areaOrder.get(b.areaId) ?? 0;
      if (ao !== bo) return ao - bo;
      return a.order - b.order;
    });
  }, [focusItems, areas]);

  function selectLayerMode(mode: SchedulerLayerMode) {
    onLayerModeChange(mode);
  }
  const stripWeekday = weekdaySun0(model.todayKey, model.timezone);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ topPx: number; label: string } | null>(
    null,
  );

  useEffect(() => {
    if (!ctx) return;
    const close = () => setCtx(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("click", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [ctx]);

  /** Slow tick for check-in due detection only — not the live clock/now-line. */
  useEffect(() => {
    const id = window.setInterval(() => setClock(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const clear = () => setDropHl(null);
    window.addEventListener("dragend", clear);
    window.addEventListener("drop", clear);
    return () => {
      window.removeEventListener("dragend", clear);
      window.removeEventListener("drop", clear);
    };
  }, []);

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
    if (checkInTarget || overlap || ctx) return;
    if (dueCheckIns[0]) setCheckInTarget(dueCheckIns[0]);
  }, [dueCheckIns, checkInTarget, overlap, ctx]);

  function submitCheckIn(outcome: CheckInOutcome, remainingMin?: number) {
    if (!checkInTarget) return;
    const entry: BlockCheckIn = {
      blockId: checkInTarget.id,
      outcome,
      remainingMin: outcome === "partly" ? remainingMin : undefined,
      checkedAt: new Date().toISOString(),
    };
    setCheckIns((prev) => upsertCheckIn(prev, entry));

    // US-D2 — unfinished placed work returns to backlog flagged replan.
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
    const id = checkInTarget.id;
    setSnoozedIds((prev) => new Set(prev).add(id));
    setCheckInTarget(null);
  }

  function timedUniverse(excludeId?: string): TimedItem[] {
    return model.items
      .filter((i) => i.id !== excludeId)
      .map((i) => ({
        id: i.id,
        date: i.date,
        start: i.start,
        end: i.end,
        title: i.title,
        kind: i.kind,
      }));
  }

  function commitBlock(candidate: PlacedBlock, mode: "create" | "update") {
    const conflicts = findConflicts(candidate, timedUniverse(candidate.id));
    if (conflicts.length) {
      setOverlap({ candidate, conflicts, mode });
      return;
    }
    applyBlock(candidate, mode);
  }

  function applyBlock(candidate: PlacedBlock, mode: "create" | "update") {
    if (mode === "create") {
      onPlacedBlocksChange([...placedBlocks, candidate]);
      if (candidate.taskId) {
        const hit = tasks.find((t) => t.id === candidate.taskId);
        if (hit) {
          onTasksChange(
            tasks.map((t) =>
              t.id === candidate.taskId
                ? { ...t, status: "planned", replan: undefined }
                : t,
            ),
          );
        } else {
          onTasksChange([
            {
              id: candidate.taskId,
              title: candidate.title,
              areaId: candidate.areaId,
              durationMin: Math.max(
                15,
                durationMinutes(candidate.start, candidate.end),
              ),
              priority: "med",
              status: "planned",
              horizon: "day",
              deepWork: candidate.deepWork,
            },
            ...tasks,
          ]);
        }
      }
    } else {
      onPlacedBlocksChange(
        placedBlocks.map((b) => (b.id === candidate.id ? candidate : b)),
      );
    }
    setOverlap(null);
  }

  function resolveOverlap(action: "shorten-mine" | "shorten-other" | "cancel") {
    if (!overlap) return;
    if (action === "cancel") {
      setOverlap(null);
      return;
    }
    let candidate = { ...overlap.candidate };
    let nextBlocks = [...placedBlocks];
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
    } else if (action === "shorten-other") {
      const otherPlaced = nextBlocks.find((b) => b.id === first.id);
      if (!otherPlaced) {
        if (minutesOf(first.start) > minutesOf(candidate.start)) {
          candidate = { ...candidate, end: first.start };
        } else {
          setOverlap(null);
          return;
        }
      } else {
        nextBlocks = nextBlocks.map((b) =>
          b.id === first.id ? { ...b, end: candidate.start } : b,
        );
        if (durationMinutes(otherPlaced.start, candidate.start) < 15) {
          setOverlap(null);
          return;
        }
        onPlacedBlocksChange(
          overlap.mode === "create"
            ? [...nextBlocks, candidate]
            : nextBlocks.map((b) => (b.id === candidate.id ? candidate : b)),
        );
        if (overlap.mode === "create" && candidate.taskId) {
          onTasksChange(
            tasks.map((t) =>
              t.id === candidate.taskId
                ? { ...t, status: "planned", replan: undefined }
                : t,
            ),
          );
        }
        setOverlap(null);
        return;
      }
    }
    if (overlap.mode === "create") {
      onPlacedBlocksChange([...nextBlocks, candidate]);
      if (candidate.taskId) {
        onTasksChange(
          tasks.map((t) =>
            t.id === candidate.taskId
              ? { ...t, status: "planned", replan: undefined }
              : t,
          ),
        );
      }
    } else {
      onPlacedBlocksChange(
        nextBlocks.map((b) => (b.id === candidate.id ? candidate : b)),
      );
    }
    setOverlap(null);
  }

  function placeNewBlock(
    dayKey: string,
    clientY: number,
    colEl: HTMLElement,
    opts: {
      taskId: string;
      title: string;
      areaId: string;
      durationMin: number;
      deepWork?: boolean;
    },
  ) {
    const start = yToStart(clientY, colEl, model.startHour, model.endHour);
    let end = addMinutes(start, opts.durationMin);
    const windowEnd = model.endHour * 60;
    if (minutesOf(end) > windowEnd) end = formatHhmm(windowEnd);
    if (durationMinutes(start, end) < 15) return;
    const area = areas.find((a) => a.id === opts.areaId);
    const candidate: PlacedBlock = {
      id: `placed-${Date.now()}`,
      taskId: opts.taskId,
      title: opts.title,
      areaId: opts.areaId,
      colour: area?.colour ?? "#0F6B4C",
      date: dayKey,
      start,
      end,
      deepWork: opts.deepWork,
    };
    commitBlock(candidate, "create");
  }

  function dropTaskOnDay(
    dayKey: string,
    clientY: number,
    colEl: HTMLElement,
    taskId: string,
  ) {
    const task = tasks.find((t) => t.id === taskId && t.status === "backlog");
    if (!task) return;
    placeNewBlock(dayKey, clientY, colEl, {
      taskId: task.id,
      title: task.title,
      areaId: task.areaId,
      durationMin: task.durationMin,
      deepWork: task.deepWork,
    });
  }

  /** Double-click empty grid to create a task block in place. */
  function addDirectOnDay(
    dayKey: string,
    clientY: number,
    colEl: HTMLElement,
  ) {
    const title = window.prompt("New task title");
    if (!title?.trim()) return;
    const areaId = areas[0]?.id ?? "work";
    const durationRaw = window.prompt("Duration (minutes)", "30");
    const durationMin = Math.max(15, Number(durationRaw) || 30);
    placeNewBlock(dayKey, clientY, colEl, {
      taskId: `task-grid-${Date.now()}`,
      title: title.trim(),
      areaId,
      durationMin,
    });
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
    const task: BacklogTask = {
      id: taskId,
      title: existing.title,
      areaId: existing.areaId,
      durationMin: Math.max(
        15,
        durationMinutes(existing.start, existing.end),
      ),
      priority: "med",
      status: "backlog",
      horizon: "day",
      deepWork: existing.deepWork,
    };
    onTasksChange([
      task,
      ...tasks.filter((t) => t.id !== taskId),
    ]);
  }

  function dropMoveBlock(
    dayKey: string,
    clientY: number,
    colEl: HTMLElement,
    blockId: string,
  ) {
    const existing = placedBlocks.find((b) => b.id === blockId);
    if (!existing) return;
    const dur = durationMinutes(existing.start, existing.end);
    const start = yToStart(clientY, colEl, model.startHour, model.endHour);
    let end = addMinutes(start, dur);
    const windowEnd = model.endHour * 60;
    if (minutesOf(end) > windowEnd) {
      end = formatHhmm(windowEnd);
    }
    if (durationMinutes(start, end) < 15) return;
    commitBlock({ ...existing, date: dayKey, start, end }, "update");
  }

  function onBlockContext(item: GridItem, e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setCtx({ x: e.clientX, y: e.clientY, item });
  }

  function onMenuAction(action: BlockMenuAction) {
    if (!ctx) return;
    const item = ctx.item;
    setCtx(null);

    if (action === "edit-placed") {
      const title = window.prompt("Block title", item.title);
      if (!title?.trim()) return;
      onPlacedBlocksChange(
        placedBlocks.map((b) =>
          b.id === item.id ? { ...b, title: title.trim() } : b,
        ),
      );
      return;
    }
    if (action === "unschedule-placed") {
      if (!window.confirm(`Move “${item.title}” back to backlog?`)) return;
      returnPlacedToBacklog(item);
      return;
    }
    if (action === "check-in") {
      setCheckInTarget(item);
    }
  }

  function onBodyMove(event: MouseEvent<HTMLDivElement>) {
    const el = bodyRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const y = event.clientY - rect.top;
    if (y < 0 || y > rect.height) {
      setHover(null);
      return;
    }
    const windowStart = model.startHour * 60;
    const windowEnd = model.endHour * 60;
    const markStart = minutesOf(HOVER_MARK_START);
    const markEnd = minutesOf(HOVER_MARK_END);
    const ratio = y / rect.height;
    let mins = windowStart + ratio * (windowEnd - windowStart);
    mins = Math.round(mins / 15) * 15;
    mins = Math.min(Math.max(mins, markStart), markEnd);
    mins = Math.min(Math.max(mins, windowStart), windowEnd);
    const topPx =
      ((mins - windowStart) / (windowEnd - windowStart)) * rect.height;
    setHover({ topPx, label: formatHhmm(mins) });
  }

  function clearDropHighlight() {
    setDropHl(null);
  }

  function slotUnderCursor(
    clientY: number,
    colEl: HTMLElement,
  ): string {
    const rect = colEl.getBoundingClientRect();
    if (rect.height <= 0 || !slots.length) return slots[0] ?? "00:00";
    const ratio = (clientY - rect.top) / rect.height;
    const idx = Math.min(
      slots.length - 1,
      Math.max(0, Math.floor(ratio * slots.length)),
    );
    return slots[idx]!;
  }

  function onColDragOver(dayKey: string, e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const types = Array.from(e.dataTransfer.types);
    const movingBlock = types.includes(BLOCK_DRAG_MIME);
    e.dataTransfer.dropEffect = movingBlock ? "move" : "copy";
    const slot = slotUnderCursor(e.clientY, e.currentTarget);
    setDropHl((prev) =>
      prev?.dayKey === dayKey && prev.slot === slot
        ? prev
        : { dayKey, slot },
    );
  }

  function onColDragLeave(dayKey: string, e: DragEvent<HTMLDivElement>) {
    const related = e.relatedTarget as Node | null;
    if (related && e.currentTarget.contains(related)) return;
    setDropHl((prev) => (prev?.dayKey === dayKey ? null : prev));
  }

  function onColDrop(dayKey: string, e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    clearDropHighlight();
    const col = e.currentTarget;
    const taskId = e.dataTransfer.getData(TASK_DRAG_MIME);
    const blockId = e.dataTransfer.getData(BLOCK_DRAG_MIME);
    if (taskId) dropTaskOnDay(dayKey, e.clientY, col, taskId);
    else if (blockId) dropMoveBlock(dayKey, e.clientY, col, blockId);
  }

  function startResize(item: GridItem, e: MouseEvent) {
    if (!item.placed) return;
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const origEnd = minutesOf(item.end);
    const onMove = (ev: globalThis.MouseEvent) => {
      const deltaRows = Math.round((ev.clientY - startY) / (ROW_PX * 16));
      let endMins = snapMinutes(
        origEnd + deltaRows * 15,
        model.startHour,
        model.endHour + 1,
      );
      endMins = Math.max(endMins, minutesOf(item.start) + 15);
      endMins = Math.min(endMins, model.endHour * 60);
      const candidate: PlacedBlock = {
        id: item.id,
        taskId: item.taskId ?? "",
        title: item.title,
        areaId: item.areaId ?? "work",
        colour: item.colour,
        date: item.date,
        start: item.start,
        end: formatHhmm(endMins),
        deepWork: item.deepWork,
      };
      onPlacedBlocksChange(
        placedBlocks.map((b) => (b.id === candidate.id ? candidate : b)),
      );
    };
    const onUp = (ev: globalThis.MouseEvent) => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      const deltaRows = Math.round((ev.clientY - startY) / (ROW_PX * 16));
      let endMins = snapMinutes(
        origEnd + deltaRows * 15,
        model.startHour,
        model.endHour + 1,
      );
      endMins = Math.max(endMins, minutesOf(item.start) + 15);
      endMins = Math.min(endMins, model.endHour * 60);
      const candidate: PlacedBlock = {
        id: item.id,
        taskId: item.taskId ?? "",
        title: item.title,
        areaId: item.areaId ?? "work",
        colour: item.colour,
        date: item.date,
        start: item.start,
        end: formatHhmm(endMins),
        deepWork: item.deepWork,
      };
      commitBlock(candidate, "update");
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  return (
    <section className="day-grid" aria-label="Five-day hourly grid">
      <div className="day-grid-meta">
        <h2>This week</h2>
        <p className="muted">
          Double-click a day to add · Combined = full grid · Focus adds Tasks
          to Focus · drag a placed block back to that panel · right-click for
          more
        </p>
        <fieldset className="scheduler-layers" aria-label="Calendar layers">
          <legend>Layers</legend>
          {SCHEDULER_LAYER_MODES.map((mode) => (
            <label key={mode} className="scheduler-layer-toggle">
              <input
                type="checkbox"
                checked={layerMode === mode}
                onChange={() => selectLayerMode(mode)}
              />
              <span>{SCHEDULER_LAYER_MODE_LABELS[mode]}</span>
            </label>
          ))}
        </fieldset>
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

      {model.warnings.length > 0 ? (
        <div className="energy-warn" role="status">
          Deep work in a low-energy band:{" "}
          {model.warnings
            .map((w) => `${w.title} (${w.start}–${w.end})`)
            .join("; ")}
          .
        </div>
      ) : null}

      {checkInTarget ? (
        <CheckInPrompt
          title={checkInTarget.title}
          start={checkInTarget.start}
          end={checkInTarget.end}
          onSubmit={submitCheckIn}
          onLater={snoozeCheckIn}
        />
      ) : null}

      <div
        className={
          layers.availability
            ? "day-grid-board has-energy week-5"
            : "day-grid-board week-5 no-availability"
        }
        style={{
          gridTemplateRows: `auto repeat(${slots.length}, minmax(${ROW_PX}rem, auto))`,
        }}
      >
        <div className="day-grid-corner" aria-hidden />
        {layers.availability ? (
          <div
            className="day-grid-energy-head"
            title="Availability / energy chunks"
          >
            A
          </div>
        ) : null}
        {model.dayKeys.map((key, dayIdx) => {
          const relative = dayIdx - model.todayIndex;
          const isPast = relative < 0;
          const isToday = relative === 0;
          const dt = dayTypeForOffset(relative, model.dayTypes);
          const headCol = layers.availability ? dayIdx + 3 : dayIdx + 2;
          return (
            <div
              key={key}
              className={
                isToday
                  ? "day-grid-head is-today"
                  : isPast
                    ? "day-grid-head is-past"
                    : "day-grid-head is-future"
              }
              style={{ gridColumn: headCol, gridRow: 1 }}
            >
              <div className="day-grid-head-title">
                {isToday ? "Today · " : null}
                {formatDayLabel(key, model.timezone)}
              </div>
              {dt && dt.type !== "normal" ? (
                <span className="day-type-tag">{dt.label}</span>
              ) : null}
              {focusDayKeys.has(key) && orderedFocus.length > 0 ? (
                <ul className="day-focus-strip" aria-label="Focus for this day">
                  {orderedFocus.map((item) => {
                    const area = areas.find((a) => a.id === item.areaId);
                    return (
                      <li
                        key={item.id}
                        className="day-focus-chip"
                        style={{
                          borderColor: area?.colour ?? "#0F6B4C",
                        }}
                        title={
                          item.subtitle
                            ? `${item.title} — ${item.subtitle}`
                            : item.title
                        }
                      >
                        <span
                          className="swatch"
                          style={{ background: area?.colour ?? "#0F6B4C" }}
                          aria-hidden
                        />
                        {item.title}
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          );
        })}

        {slots.map((slot, idx) => (
          <div
            key={slot}
            className="day-grid-time"
            style={{ gridColumn: 1, gridRow: idx + 2 }}
          >
            {slot.endsWith(":00") ? slot : ""}
          </div>
        ))}

        {layers.availability ? (
          <div
            className="day-grid-energy"
            style={{ gridRow: `2 / span ${slots.length}` }}
            aria-label="Availability / energy chunks"
          >
            {slots.map((slot) => {
              const level = slotBandLevel(slot, model.bands, stripWeekday);
              return (
                <div
                  key={`e-${slot}`}
                  className="day-grid-energy-slot"
                  style={{
                    background: level ? bandColour(level) : "transparent",
                  }}
                  title={level ? `${slot} · ${level}` : slot}
                />
              );
            })}
          </div>
        ) : null}

        <div
          ref={bodyRef}
          className="day-grid-body"
          style={{
            gridColumn: layers.availability
              ? `3 / span ${model.dayKeys.length}`
              : `2 / span ${model.dayKeys.length}`,
            gridRow: `2 / span ${slots.length}`,
          }}
          onMouseMove={onBodyMove}
          onMouseLeave={() => setHover(null)}
        >
          {model.dayKeys.map((dayKey, dayIdx) => {
            const relative = dayIdx - model.todayIndex;
            const isPast = relative < 0;
            const isToday = relative === 0;
            return (
              <div
                key={`col-${dayKey}`}
                className={
                  (isToday
                    ? "day-grid-col is-today drop-target"
                    : isPast
                      ? "day-grid-col is-past drop-target"
                      : "day-grid-col is-future drop-target") +
                  (dropHl?.dayKey === dayKey ? " is-drop-over" : "")
                }
                onDragOver={(e) => onColDragOver(dayKey, e)}
                onDragLeave={(e) => onColDragLeave(dayKey, e)}
                onDrop={(e) => onColDrop(dayKey, e)}
                onDoubleClick={(e) => {
                  if ((e.target as HTMLElement).closest(".day-grid-item"))
                    return;
                  addDirectOnDay(dayKey, e.clientY, e.currentTarget);
                }}
              >
                {slots.map((slot) => (
                  <div
                    key={`${dayKey}-${slot}`}
                    className={
                      dropHl?.dayKey === dayKey && dropHl.slot === slot
                        ? "day-grid-slot is-drop-slot"
                        : "day-grid-slot"
                    }
                  />
                ))}
                {visibleItems
                  .filter((item) => item.date === dayKey)
                  .map((item) => {
                    const place = itemPlacement(
                      item,
                      model.startHour,
                      model.endHour,
                    );
                    if (!place) return null;
                    const warned = warnIds.has(item.id);
                    const checkIn = checkIns[item.id];
                    const clashing = clashIds.has(item.id);
                    const layer = layerForItem(item);
                    return (
                      <article
                        key={item.id}
                        className={`day-grid-item kind-${item.kind} layer-${layer ?? "none"}${warned ? " is-warn" : ""}${item.placed ? " is-placed" : ""}${checkIn ? ` checkin-${checkIn.outcome}` : ""}${clashing ? " is-clash" : ""}`}
                        style={{
                          top: `calc(${(place.rowStart - 2) * ROW_PX}rem)`,
                          height: `calc(${place.rowSpan * ROW_PX}rem - 2px)`,
                          background: item.colour,
                        }}
                        title={`${item.title} ${item.start}–${item.end}${warned ? " · deep work in low band" : ""}${clashing ? " · overlaps another layer" : ""}${checkIn ? ` · ${outcomeLabel(checkIn.outcome)}${checkIn.remainingMin != null ? ` (${checkIn.remainingMin}m left)` : ""}` : ""} · right-click for actions`}
                        draggable={Boolean(item.placed)}
                        onDragStart={(e) => {
                          if (!item.placed) return;
                          e.dataTransfer.setData(BLOCK_DRAG_MIME, item.id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onContextMenu={(e) => onBlockContext(item, e)}
                      >
                        <span className="day-grid-item-title">
                          {warned || clashing ? "! " : ""}
                          {item.title}
                        </span>
                        <span className="day-grid-item-time">
                          {item.start}–{item.end}
                          {checkIn
                            ? ` · ${outcomeLabel(checkIn.outcome)}`
                            : ""}
                        </span>
                        {item.placed ? (
                          <button
                            type="button"
                            className="resize-handle"
                            aria-label="Resize block"
                            onMouseDown={(e) => startResize(item, e)}
                          />
                        ) : null}
                      </article>
                    );
                  })}
              </div>
            );
          })}

          {hover ? (
            <div
              className="day-grid-hover-guide"
              style={{ top: hover.topPx }}
              aria-hidden
            >
              <span className="day-grid-hover-label">{hover.label}</span>
            </div>
          ) : null}

          <NowIndicator
            timeZone={model.timezone}
            startHour={model.startHour}
            endHour={model.endHour}
            dayCount={model.dayKeys.length}
            todayIndex={model.todayIndex}
            todayKey={model.todayKey}
          />
        </div>
      </div>

      <ul className="day-grid-legend muted">
        <li>
          <span className="swatch" style={{ background: "#0F6B4C" }} /> Scheduled
          work
        </li>
        <li>
          <span className="swatch" style={{ background: "#9AA29A" }} /> Recurring
        </li>
        <li>
          <span className="swatch" style={{ background: "#C45C26" }} /> Fixed
        </li>
        <li>
          <span className="swatch" style={{ background: "#7BC47F" }} />{" "}
          Availability
        </li>
        <li>
          <span
            className="swatch clash-swatch"
            style={{ background: "transparent" }}
          />{" "}
          Clash (overlap)
        </li>
      </ul>

      {ctx ? (
        <BlockContextMenu
          x={ctx.x}
          y={ctx.y}
          item={ctx.item}
          onAction={onMenuAction}
          onClose={() => setCtx(null)}
        />
      ) : null}
    </section>
  );
}
