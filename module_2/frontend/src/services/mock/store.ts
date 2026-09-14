import type { Board } from "../types";

export const STORAGE_KEY = "weekslot-board-v1";

export function seedBoard(): Board {
  return {
    projects: [
      { id: "p-website", name: "Website Revamp", colorIndex: 0 },
      { id: "p-thesis", name: "Thesis", colorIndex: 1 },
      { id: "p-home", name: "Home", colorIndex: 2 },
    ],
    cards: [
      {
        id: "c-1",
        projectId: "p-website",
        title: "Draft new landing copy",
        status: "in_progress",
        slot: { day: 0, hour: 9 },
      },
      {
        id: "c-2",
        projectId: "p-website",
        title: "Audit old blog images",
        status: "todo",
        slot: null,
      },
      {
        id: "c-3",
        projectId: "p-thesis",
        title: "Read chapter 4 sources",
        status: "todo",
        slot: { day: 2, hour: 14 },
      },
      {
        id: "c-4",
        projectId: "p-thesis",
        title: "Rewrite methodology intro",
        status: "todo",
        slot: null,
      },
      {
        id: "c-5",
        projectId: "p-home",
        title: "Book boiler service",
        status: "completed",
        slot: null,
      },
      {
        id: "c-6",
        projectId: "p-home",
        title: "Plan weekend groceries",
        status: "todo",
        slot: { day: 5, hour: 11 },
      },
    ],
    settings: { mondayDate: null },
  };
}

function canPersist(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

export function loadBoard(): Board {
  if (!canPersist()) return seedBoard();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedBoard();
    return JSON.parse(raw) as Board;
  } catch {
    return seedBoard();
  }
}

export function saveBoard(board: Board): void {
  if (!canPersist()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
  } catch {
    /* storage full or blocked - the in-memory board still works */
  }
}
