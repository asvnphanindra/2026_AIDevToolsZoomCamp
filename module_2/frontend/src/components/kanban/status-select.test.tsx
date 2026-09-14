import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { StatusSelect } from "@/components/kanban/status-select";

describe("StatusSelect", () => {
  it("renders the current status label on the trigger", () => {
    render(<StatusSelect status="in_progress" onChange={vi.fn()} />);

    const trigger = screen.getByLabelText("Card status");
    expect(trigger).toHaveTextContent("In Progress");
    expect(trigger).toHaveAttribute("role", "combobox");
  });
});
