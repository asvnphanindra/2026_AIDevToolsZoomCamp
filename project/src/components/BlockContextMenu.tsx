import type { GridItem } from "@/lib/day-grid";

export type BlockMenuAction =
  | "cancel-session"
  | "replace-session"
  | "extra-session"
  | "remove-one-off"
  | "edit-placed"
  | "unschedule-placed";

type Props = {
  x: number;
  y: number;
  item: GridItem;
  onAction: (action: BlockMenuAction) => void;
  onClose: () => void;
};

/** Right-click menu for grid cards (one-offs + placed actions). */
export function BlockContextMenu({ x, y, item, onAction, onClose }: Props) {
  const items: { id: BlockMenuAction; label: string }[] = [];

  if (item.kind === "schedule" && item.oneOff) {
    items.push({ id: "remove-one-off", label: "Remove one-off" });
  } else if (item.kind === "schedule") {
    items.push(
      { id: "cancel-session", label: "Cancel this session" },
      { id: "replace-session", label: "Replace (substitute)…" },
      { id: "extra-session", label: "Add extra at this time…" },
    );
  }

  if (item.placed) {
    items.push(
      { id: "edit-placed", label: "Edit title…" },
      { id: "unschedule-placed", label: "Unschedule" },
    );
  }

  if (!items.length) {
    return (
      <div
        className="block-ctx-menu"
        style={{ left: x, top: y }}
        role="menu"
      >
        <p className="muted">No actions for this card.</p>
        <button type="button" className="secondary" onClick={onClose}>
          Close
        </button>
      </div>
    );
  }

  return (
    <div
      className="block-ctx-menu"
      style={{ left: x, top: y }}
      role="menu"
      onContextMenu={(e) => e.preventDefault()}
    >
      <p className="block-ctx-title">
        {item.title} · {item.start}–{item.end}
      </p>
      {items.map((entry) => (
        <button
          key={entry.id}
          type="button"
          role="menuitem"
          onClick={() => onAction(entry.id)}
        >
          {entry.label}
        </button>
      ))}
      <button type="button" className="secondary" onClick={onClose}>
        Close
      </button>
    </div>
  );
}
