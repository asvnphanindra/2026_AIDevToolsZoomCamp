import { ServiceError, type KanbanService } from "../kanban-service";
import type { Board, Card, CardStatus, Project, Slot } from "../types";
import { FIRST_HOUR, LAST_HOUR } from "../types";
import { loadBoard, saveBoard, seedBoard } from "./store";

let counter = 0;
function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export interface MockOptions {
  /** Simulated network latency in ms. Set to 0 in tests. */
  latencyMs?: number;
  initialBoard?: Board;
  persist?: boolean;
}

/**
 * In-memory implementation of KanbanService. Lets the whole app run with no
 * real backend; state survives reloads via localStorage.
 */
export class MockKanbanService implements KanbanService {
  private board: Board;
  private latencyMs: number;
  private persist: boolean;

  constructor(options: MockOptions = {}) {
    this.latencyMs = options.latencyMs ?? 180;
    this.persist = options.persist ?? true;
    this.board = options.initialBoard
      ? clone(options.initialBoard)
      : this.persist
        ? loadBoard()
        : seedBoard();
  }

  private async commit<T>(value: T): Promise<T> {
    if (this.persist) saveBoard(this.board);
    if (this.latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.latencyMs));
    }
    // JSON cannot round-trip `undefined` (void deletes); skip clone in that case.
    if (value === undefined) return value;
    return clone(value);
  }

  private project(id: string): Project {
    const project = this.board.projects.find((p) => p.id === id);
    if (!project) throw new ServiceError(`Project not found: ${id}`);
    return project;
  }

  private card(id: string): Card {
    const card = this.board.cards.find((c) => c.id === id);
    if (!card) throw new ServiceError(`Card not found: ${id}`);
    return card;
  }

  getBoard(): Promise<Board> {
    return this.commit(this.board);
  }

  createProject({ name }: { name: string }): Promise<Project> {
    const trimmed = name.trim();
    if (!trimmed) throw new ServiceError("Project name is required");
    const used = new Set(this.board.projects.map((p) => p.colorIndex));
    let colorIndex = 0;
    while (used.has(colorIndex) && colorIndex < 6) colorIndex += 1;
    const project: Project = { id: nextId("p"), name: trimmed, colorIndex };
    this.board.projects.push(project);
    return this.commit(project);
  }

  renameProject({ id, name }: { id: string; name: string }): Promise<Project> {
    const trimmed = name.trim();
    if (!trimmed) throw new ServiceError("Project name is required");
    const project = this.project(id);
    project.name = trimmed;
    return this.commit(project);
  }

  deleteProject({ id }: { id: string }): Promise<void> {
    this.project(id);
    this.board.projects = this.board.projects.filter((p) => p.id !== id);
    this.board.cards = this.board.cards.filter((c) => c.projectId !== id);
    return this.commit(undefined as void);
  }

  createCard({ projectId, title }: { projectId: string; title: string }): Promise<Card> {
    const trimmed = title.trim();
    if (!trimmed) throw new ServiceError("Card title is required");
    this.project(projectId);
    const card: Card = {
      id: nextId("c"),
      projectId,
      title: trimmed,
      status: "todo",
      slot: null,
    };
    this.board.cards.push(card);
    return this.commit(card);
  }

  updateCard({
    id,
    title,
    status,
  }: {
    id: string;
    title?: string;
    status?: CardStatus;
  }): Promise<Card> {
    const card = this.card(id);
    if (title !== undefined) {
      const trimmed = title.trim();
      if (!trimmed) throw new ServiceError("Card title is required");
      card.title = trimmed;
    }
    if (status !== undefined) card.status = status;
    return this.commit(card);
  }

  deleteCard({ id }: { id: string }): Promise<void> {
    this.card(id);
    this.board.cards = this.board.cards.filter((c) => c.id !== id);
    return this.commit(undefined as void);
  }

  mapCard({ id, slot }: { id: string; slot: Slot | null }): Promise<Card> {
    const card = this.card(id);
    if (slot === null) {
      card.slot = null;
      return this.commit(card);
    }
    if (slot.day < 0 || slot.day > 6) throw new ServiceError("Day must be 0-6");
    if (slot.hour < FIRST_HOUR || slot.hour > LAST_HOUR) {
      throw new ServiceError(`Hour must be ${FIRST_HOUR}-${LAST_HOUR}`);
    }
    const occupant = this.board.cards.find(
      (c) => c.id !== id && c.slot && c.slot.day === slot.day && c.slot.hour === slot.hour,
    );
    // A cell holds at most one card: the previous occupant returns to the task grid.
    if (occupant) occupant.slot = null;
    card.slot = { ...slot };
    return this.commit(card);
  }

  setMondayDate({ mondayDate }: { mondayDate: string | null }): Promise<Board> {
    this.board.settings.mondayDate = mondayDate;
    return this.commit(this.board);
  }
}
