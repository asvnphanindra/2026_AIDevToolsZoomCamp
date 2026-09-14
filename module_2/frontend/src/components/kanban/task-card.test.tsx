import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TaskCard } from "@/components/kanban/task-card";
import type { Card, Project } from "@/services/types";

const project: Project = { id: "p1", name: "Website", colorIndex: 0 };
const card: Card = {
  id: "c1",
  projectId: "p1",
  title: "Draft landing copy",
  status: "todo",
  slot: null,
};

describe("TaskCard", () => {
  it("renders title, project, and status control", () => {
    render(
      <TaskCard
        card={card}
        project={project}
        onStatusChange={vi.fn()}
        onRename={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("Draft landing copy")).toBeInTheDocument();
    expect(screen.getByText("Website")).toBeInTheDocument();
    expect(screen.getByLabelText("Card status")).toBeInTheDocument();
  });
});
