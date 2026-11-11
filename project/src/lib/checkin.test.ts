import { describe, expect, it } from "vitest";
import {
  isBlockEnded,
  replanUnfinishedTask,
} from "@/lib/checkin";
import type { BacklogTask } from "@/lib/tasks";

describe("check-in + replan", () => {
  const block = {
    taskId: "task-1",
    title: "Write notes",
    areaId: "work",
    start: "09:00",
    end: "10:00",
    deepWork: true,
  };

  const tasks: BacklogTask[] = [
    {
      id: "task-1",
      title: "Write notes",
      areaId: "work",
      durationMin: 60,
      priority: "med",
      status: "scheduled",
      horizon: "day",
      deepWork: true,
    },
  ];

  it("treats done as no replan", () => {
    expect(replanUnfinishedTask(tasks, block, "done")).toBeNull();
  });

  it("returns unfinished blocks to backlog with remaining time", () => {
    const partly = replanUnfinishedTask(tasks, block, "partly", 20);
    expect(partly?.[0]).toMatchObject({
      id: "task-1",
      status: "backlog",
      durationMin: 20,
      replan: true,
    });

    const notDone = replanUnfinishedTask(tasks, block, "not-done");
    expect(notDone?.[0]).toMatchObject({
      durationMin: 60,
      replan: true,
      status: "backlog",
    });
  });

  it("marks a block ended after its end time", () => {
    const now = new Date("2026-11-11T10:00:00+05:30");
    expect(isBlockEnded("2026-11-11", "10:00", "Asia/Kolkata", now)).toBe(true);
    expect(isBlockEnded("2026-11-11", "10:15", "Asia/Kolkata", now)).toBe(false);
    expect(isBlockEnded("2026-11-10", "23:00", "Asia/Kolkata", now)).toBe(true);
  });
});
