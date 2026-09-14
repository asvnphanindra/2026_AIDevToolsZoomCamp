export const CARD_MIME = "application/x-kanban-card";

/**
 * Some browsers hide dataTransfer contents during dragover, so we also track
 * the card being dragged in module state for hover affordances.
 */
let draggingCardId: string | null = null;

export function startCardDrag(event: React.DragEvent, cardId: string): void {
  draggingCardId = cardId;
  event.dataTransfer.setData(CARD_MIME, cardId);
  event.dataTransfer.setData("text/plain", cardId);
  event.dataTransfer.effectAllowed = "move";
}

export function endCardDrag(): void {
  draggingCardId = null;
}

export function getDraggingCardId(): string | null {
  return draggingCardId;
}

export function readCardId(event: React.DragEvent): string | null {
  return (
    event.dataTransfer.getData(CARD_MIME) ||
    event.dataTransfer.getData("text/plain") ||
    draggingCardId
  );
}
