import type { GridItem } from "@/lib/day-grid";

export type BlockMenuAction =
  | "edit-placed"
  | "unschedule-placed"
  | "check-in";

type Props = {
  x: number;
  y: number;
  item: GridItem;
  onAction: (action: BlockMenuAction) => void;
  onClose: () => void;
};

/** Right-click menu for placed blocks (edit / unschedule / check-in). */
export function BlockContextMenu({ x, y, item, onAction, onClose }: Props) {
  const items: { id: BlockMenuAction; label: string }[] = [];

  if (item.placed) {
    items.push(
      { id: "edit-placed", label: "Edit title…" },
      { id: "unschedule-placed", label: "Move to backlog" },
    );
  }

  if (item.kind === "block") {
    items.push({ id: "check-in", label: "Check in…" });
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
