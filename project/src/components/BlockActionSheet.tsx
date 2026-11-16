import { useState } from "react";
import { BottomSheet } from "@/components/BottomSheet";
import { addMinutes, durationMinutes, type PlacedBlock } from "@/lib/blocks";
import type { GridItem } from "@/lib/day-grid";
import { minutesOf } from "@/lib/time";

export type BlockSheetAction =
  | { type: "edit-title"; title: string }
  | { type: "move"; date: string; start: string; end: string }
  | { type: "resize"; end: string }
  | { type: "unschedule" }
  | { type: "check-in" };

type Props = {
  item: GridItem | null;
  open: boolean;
  onClose: () => void;
  onAction: (action: BlockSheetAction) => void;
};

/** Touch action sheet: edit / move / resize / unschedule / check-in. */
export function BlockActionSheet({ item, open, onClose, onAction }: Props) {
  const [mode, setMode] = useState<"menu" | "move" | "resize" | "edit">("menu");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  if (!item) return null;

  function openMenu() {
    setMode("menu");
  }

  function beginEdit() {
    setTitle(item!.title);
    setMode("edit");
  }

  function beginMove() {
    setDate(item!.date);
    setStart(item!.start);
    setEnd(item!.end);
    setMode("move");
  }

  function beginResize() {
    setEnd(item!.end);
    setMode("resize");
  }

  function nudgeEnd(delta: number) {
    const next = addMinutes(end || item!.end, delta);
    if (minutesOf(next) <= minutesOf(item!.start) + 14) return;
    setEnd(next);
  }

  function nudgeStart(delta: number) {
    const dur = durationMinutes(start || item!.start, end || item!.end);
    const nextStart = addMinutes(start || item!.start, delta);
    setStart(nextStart);
    setEnd(addMinutes(nextStart, dur));
  }

  return (
    <BottomSheet
      open={open}
      title={item.title}
      onClose={() => {
        openMenu();
        onClose();
      }}
    >
      <p className="muted">
        {item.start}–{item.end} · {item.date}
      </p>

      {mode === "menu" ? (
        <div className="sheet-actions">
          {item.placed ? (
            <>
              <button type="button" className="tap-target" onClick={beginEdit}>
                Edit title…
              </button>
              <button type="button" className="tap-target" onClick={beginMove}>
                Move…
              </button>
              <button type="button" className="tap-target" onClick={beginResize}>
                Resize…
              </button>
              <button
                type="button"
                className="secondary tap-target"
                onClick={() => onAction({ type: "unschedule" })}
              >
                Move to backlog
              </button>
            </>
          ) : null}
          {item.kind === "block" ? (
            <button
              type="button"
              className="tap-target"
              onClick={() => onAction({ type: "check-in" })}
            >
              Check in…
            </button>
          ) : null}
          {!item.placed && item.kind !== "block" ? (
            <p className="muted">No actions for this card.</p>
          ) : null}
        </div>
      ) : null}

      {mode === "edit" ? (
        <div className="sheet-actions">
          <label>
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </label>
          <button
            type="button"
            className="tap-target"
            onClick={() => {
              if (!title.trim()) return;
              onAction({ type: "edit-title", title: title.trim() });
              openMenu();
            }}
          >
            Save title
          </button>
          <button type="button" className="secondary tap-target" onClick={openMenu}>
            Back
          </button>
        </div>
      ) : null}

      {mode === "move" ? (
        <div className="sheet-actions">
          <label>
            Date
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label>
            Start
            <input
              type="time"
              step={900}
              value={start}
              onChange={(e) => {
                const dur = durationMinutes(start, end);
                setStart(e.target.value);
                setEnd(addMinutes(e.target.value, dur));
              }}
            />
          </label>
          <div className="stepper-row">
            <button
              type="button"
              className="secondary tap-target"
              onClick={() => nudgeStart(-15)}
            >
              −15 min
            </button>
            <button
              type="button"
              className="secondary tap-target"
              onClick={() => nudgeStart(15)}
            >
              +15 min
            </button>
          </div>
          <p className="muted">
            Ends {end} ({durationMinutes(start, end)}m)
          </p>
          <button
            type="button"
            className="tap-target"
            onClick={() => {
              onAction({ type: "move", date, start, end });
              openMenu();
            }}
          >
            Save move
          </button>
          <button type="button" className="secondary tap-target" onClick={openMenu}>
            Back
          </button>
        </div>
      ) : null}

      {mode === "resize" ? (
        <div className="sheet-actions">
          <label>
            End
            <input
              type="time"
              step={900}
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
          <div className="stepper-row">
            <button
              type="button"
              className="secondary tap-target"
              onClick={() => nudgeEnd(-15)}
            >
              −15 min
            </button>
            <button
              type="button"
              className="secondary tap-target"
              onClick={() => nudgeEnd(15)}
            >
              +15 min
            </button>
          </div>
          <p className="muted">
            {item.start}–{end} ({durationMinutes(item.start, end)}m)
          </p>
          <button
            type="button"
            className="tap-target"
            onClick={() => {
              if (minutesOf(end) <= minutesOf(item.start) + 14) return;
              onAction({ type: "resize", end });
              openMenu();
            }}
          >
            Save size
          </button>
          <button type="button" className="secondary tap-target" onClick={openMenu}>
            Back
          </button>
        </div>
      ) : null}
    </BottomSheet>
  );
}

export function applyBlockSheetAction(
  item: GridItem,
  action: BlockSheetAction,
  placedBlocks: PlacedBlock[],
): PlacedBlock[] | null {
  if (!item.placed) return null;
  if (action.type === "edit-title") {
    return placedBlocks.map((b) =>
      b.id === item.id ? { ...b, title: action.title } : b,
    );
  }
  if (action.type === "move") {
    return placedBlocks.map((b) =>
      b.id === item.id
        ? { ...b, date: action.date, start: action.start, end: action.end }
        : b,
    );
  }
  if (action.type === "resize") {
    return placedBlocks.map((b) =>
      b.id === item.id ? { ...b, end: action.end } : b,
    );
  }
  return null;
}
