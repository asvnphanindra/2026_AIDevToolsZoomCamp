import { HttpKanbanService } from "./http-kanban-service";

/**
 * The app's single service instance — HTTP client for FastAPI + SQLite.
 * Swap to MockKanbanService only for offline UI work without a backend.
 */
export const kanbanService = new HttpKanbanService();

export type { KanbanService } from "./kanban-service";
export * from "./types";
export { getAccessToken, clearAccessToken, UNAUTHORIZED_EVENT } from "./auth-storage";
