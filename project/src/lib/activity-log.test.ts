import { describe, expect, it } from "vitest";
import {
  appendActivityLocal,
  filterActivity,
  hideNetZeroPairs,
  type ActivityEntry,
} from "@/lib/activity-log";

function entry(
  partial: Partial<ActivityEntry> & Pick<ActivityEntry, "id" | "action" | "entityId">,
): ActivityEntry {
  return {
    at: partial.at ?? "2026-01-01T10:00:00.000Z",
    actorUid: partial.actorUid ?? "u1",
    actorLabel: partial.actorLabel ?? "Alex",
    actorRole: partial.actorRole ?? "owner",
    entityType: partial.entityType ?? "task",
    summary: partial.summary ?? partial.action,
    ...partial,
  };
}

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

describe("hideNetZeroPairs", () => {
  it("hides add-then-delete pairs on the same entityId", () => {
    const entries = [
      entry({
        id: "d1",
        action: "delete",
        entityId: "t1",
        at: "2026-01-02T12:00:00.000Z",
      }),
      entry({
        id: "a1",
        action: "add",
        entityId: "t1",
        at: "2026-01-02T10:00:00.000Z",
      }),
      entry({
        id: "u1",
        action: "update",
        entityId: "t2",
        at: "2026-01-02T11:00:00.000Z",
      }),
    ];
    const filtered = hideNetZeroPairs(entries);
    expect(filtered.map((e) => e.id)).toEqual(["u1"]);
  });
});

describe("filterActivity", () => {
  const sample: ActivityEntry[] = [
    entry({
      id: "1",
      action: "update",
      entityId: "a",
      actorRole: "bot",
      entityType: "teachingPlan",
      at: "2026-03-10T09:00:00.000Z",
    }),
    entry({
      id: "2",
      action: "add",
      entityId: "b",
      actorRole: "owner",
      entityType: "task",
      at: "2026-03-11T09:00:00.000Z",
    }),
    entry({
      id: "3",
      action: "delete",
      entityId: "b",
      actorRole: "owner",
      entityType: "task",
      at: "2026-03-12T09:00:00.000Z",
    }),
  ];

  it("filters by role", () => {
    expect(filterActivity(sample, { role: "bot" }).map((e) => e.id)).toEqual([
      "1",
    ]);
  });

  it("filters by date range", () => {
    expect(
      filterActivity(sample, { from: "2026-03-11", to: "2026-03-11" }).map(
        (e) => e.id,
      ),
    ).toEqual(["2"]);
  });

  it("applies hideNetZero with other filters", () => {
    expect(
      filterActivity(sample, { role: "owner", hideNetZero: true }).map(
        (e) => e.id,
      ),
    ).toEqual([]);
  });
});
