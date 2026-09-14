import { beforeEach, describe, expect, it } from "vitest";

import { ServiceError } from "@/services/kanban-service";
import { MockKanbanService } from "@/services/mock/mock-kanban-service";
import type { Board } from "@/services/types";

function emptyBoard(): Board {
  return {
    projects: [{ id: "p1", name: "Alpha", colorIndex: 0 }],
    cards: [],
    settings: { mondayDate: null },
  };
}

describe("MockKanbanService", () => {
  let service: MockKanbanService;

  beforeEach(() => {
    service = new MockKanbanService({
      latencyMs: 0,
      persist: false,
      initialBoard: emptyBoard(),
    });
  });

  it("creates cards on a project as todo and unmapped", async () => {
    const card = await service.createCard({ projectId: "p1", title: "  Ship UI  " });
    expect(card.title).toBe("Ship UI");
    expect(card.status).toBe("todo");
    expect(card.slot).toBeNull();
    expect(card.projectId).toBe("p1");
  });

  it("maps a card to one cell and unmaps it back to the task grid", async () => {
    const card = await service.createCard({ projectId: "p1", title: "Plan week" });
    const mapped = await service.mapCard({ id: card.id, slot: { day: 1, hour: 10 } });
    expect(mapped.slot).toEqual({ day: 1, hour: 10 });

    const unmapped = await service.mapCard({ id: card.id, slot: null });
    expect(unmapped.slot).toBeNull();
  });

  it("keeps one card per cell by returning the previous occupant to the task grid", async () => {
    const a = await service.createCard({ projectId: "p1", title: "A" });
    const b = await service.createCard({ projectId: "p1", title: "B" });
    await service.mapCard({ id: a.id, slot: { day: 0, hour: 8 } });
    await service.mapCard({ id: b.id, slot: { day: 0, hour: 8 } });

    const board = await service.getBoard();
    const cardA = board.cards.find((c) => c.id === a.id);
    const cardB = board.cards.find((c) => c.id === b.id);
    expect(cardA?.slot).toBeNull();
    expect(cardB?.slot).toEqual({ day: 0, hour: 8 });
  });

  it("rejects empty titles and unknown projects", () => {
    expect(() => service.createCard({ projectId: "p1", title: "   " })).toThrow(ServiceError);
    expect(() => service.createCard({ projectId: "missing", title: "Nope" })).toThrow(
      ServiceError,
    );
  });

  it("updates status and stores a Monday label date", async () => {
    const card = await service.createCard({ projectId: "p1", title: "Write tests" });
    const updated = await service.updateCard({ id: card.id, status: "completed" });
    expect(updated.status).toBe("completed");

    const board = await service.setMondayDate({ mondayDate: "2026-09-14" });
    expect(board.settings.mondayDate).toBe("2026-09-14");
  });

  it("deletes a project and its cards", async () => {
    await service.createCard({ projectId: "p1", title: "Gone soon" });
    await service.deleteProject({ id: "p1" });
    const board = await service.getBoard();
    expect(board.projects).toHaveLength(0);
    expect(board.cards).toHaveLength(0);
  });
});
