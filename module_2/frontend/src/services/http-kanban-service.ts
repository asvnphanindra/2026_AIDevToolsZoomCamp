import { getApiBaseUrl } from "./api-config";
import {
  clearAccessToken,
  getAccessToken,
  notifyUnauthorized,
  setAccessToken,
} from "./auth-storage";
import { ServiceError, type KanbanService } from "./kanban-service";
import type { Board, Card, CardStatus, Project, Slot } from "./types";

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

async function parseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: unknown };
    if (typeof body.detail === "string") return body.detail;
    return JSON.stringify(body.detail ?? body);
  } catch {
    return response.statusText || `HTTP ${response.status}`;
  }
}

/**
 * HTTP-backed KanbanService talking to the FastAPI + SQLAlchemy backend.
 */
export class HttpKanbanService implements KanbanService {
  constructor(private readonly baseUrl: string = getApiBaseUrl()) {}

  async login(input: { username: string; password: string }): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      throw new ServiceError(await parseError(response));
    }
    const body = (await response.json()) as { access_token: string };
    setAccessToken(body.access_token);
  }

  logout(): void {
    clearAccessToken();
  }

  getBoard(): Promise<Board> {
    return this.request<Board>("GET", "/api/board");
  }

  createProject(input: { name: string }): Promise<Project> {
    return this.request<Project>("POST", "/api/projects", input);
  }

  renameProject(input: { id: string; name: string }): Promise<Project> {
    return this.request<Project>("PATCH", `/api/projects/${input.id}`, {
      name: input.name,
    });
  }

  async deleteProject(input: { id: string }): Promise<void> {
    await this.request<void>("DELETE", `/api/projects/${input.id}`);
  }

  createCard(input: { projectId: string; title: string }): Promise<Card> {
    return this.request<Card>("POST", "/api/cards", input);
  }

  updateCard(input: {
    id: string;
    title?: string;
    status?: CardStatus;
  }): Promise<Card> {
    const body: { title?: string; status?: CardStatus } = {};
    if (input.title !== undefined) body.title = input.title;
    if (input.status !== undefined) body.status = input.status;
    return this.request<Card>("PATCH", `/api/cards/${input.id}`, body);
  }

  async deleteCard(input: { id: string }): Promise<void> {
    await this.request<void>("DELETE", `/api/cards/${input.id}`);
  }

  mapCard(input: { id: string; slot: Slot | null }): Promise<Card> {
    return this.request<Card>("PUT", `/api/cards/${input.id}/slot`, {
      slot: input.slot,
    });
  }

  setMondayDate(input: { mondayDate: string | null }): Promise<Board> {
    return this.request<Board>("PUT", "/api/settings/week", input);
  }

  private async request<T>(
    method: HttpMethod,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const token = getAccessToken();
    const headers: Record<string, string> = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers["Content-Type"] = "application/json";

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (response.status === 401) {
      notifyUnauthorized();
      throw new ServiceError("Not authenticated");
    }

    if (!response.ok) {
      throw new ServiceError(await parseError(response));
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }
}
