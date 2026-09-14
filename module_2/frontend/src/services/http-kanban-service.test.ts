import { afterEach, describe, expect, it, vi } from "vitest";

import { HttpKanbanService } from "@/services/http-kanban-service";
import { clearAccessToken, getAccessToken } from "@/services/auth-storage";

describe("HttpKanbanService", () => {
  afterEach(() => {
    clearAccessToken();
    vi.unstubAllGlobals();
  });

  it("stores the bearer token after login", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ access_token: "tok-123", token_type: "bearer" }),
      }),
    );

    const service = new HttpKanbanService("http://api.test");
    await service.login({ username: "demo", password: "demo123" });
    expect(getAccessToken()).toBe("tok-123");
  });

  it("sends Authorization on getBoard", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        projects: [],
        cards: [],
        settings: { mondayDate: null },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    // Seed token as if logged in.
    window.localStorage.setItem("mini-kanban-access-token", "abc");
    const service = new HttpKanbanService("http://api.test");
    await service.getBoard();

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/api/board",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ Authorization: "Bearer abc" }),
      }),
    );
  });
});
