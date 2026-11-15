import { describe, expect, it } from "vitest";
import { appendActivityLocal } from "@/lib/activity-log";

describe("appendActivityLocal", () => {
  it("prepends a new entry without mutating prior ids", () => {
    const first = appendActivityLocal([], {
      actorUid: "u1",
      actorLabel: "Alex",
      actorRole: "owner",
      action: "update",
      entityType: "teachingPlan",
      entityId: "job-default",
      summary: "Updated teaching plan",
      at: "2026-01-01T10:00:00.000Z",
      id: "act-1",
    });
    expect(first).toHaveLength(1);
    expect(first[0]?.id).toBe("act-1");

    const second = appendActivityLocal(first, {
      actorUid: "bot-1",
      actorLabel: "PlanBot",
      actorRole: "bot",
      action: "update",
      entityType: "teachingPlan",
      entityId: "job-default",
      summary: "Bot set coverage",
      at: "2026-01-01T11:00:00.000Z",
      id: "act-2",
    });

    expect(second).toHaveLength(2);
    expect(second[0]?.id).toBe("act-2");
    expect(second[1]?.id).toBe("act-1");
    expect(first).toHaveLength(1);
  });
});
