import type { Board, Card, CardStatus, Project, Slot } from "./types";

/**
 * Single backend boundary for the app. Every read/write goes through this
 * interface, so swapping the mock for a real HTTP client touches one file.
 */
export interface KanbanService {
  getBoard(): Promise<Board>;

  createProject(input: { name: string }): Promise<Project>;
  renameProject(input: { id: string; name: string }): Promise<Project>;
  /** Deletes the project and every card that belongs to it. */
  deleteProject(input: { id: string }): Promise<void>;

  createCard(input: { projectId: string; title: string }): Promise<Card>;
  updateCard(input: { id: string; title?: string; status?: CardStatus }): Promise<Card>;
  deleteCard(input: { id: string }): Promise<void>;

  /**
   * Maps a card onto a timetable cell, or unmaps it when `slot` is null.
   * A cell holds at most one card; a card occupies at most one cell.
   */
  mapCard(input: { id: string; slot: Slot | null }): Promise<Card>;

  setMondayDate(input: { mondayDate: string | null }): Promise<Board>;
}

export class ServiceError extends Error {}
