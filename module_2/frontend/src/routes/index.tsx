import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { Board } from "@/components/kanban/board";
import { LoginForm } from "@/components/kanban/login-form";
import {
  UNAUTHORIZED_EVENT,
  getAccessToken,
  kanbanService,
} from "@/services";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mini Kanban — Weekly Timetable Planner" },
      {
        name: "description",
        content:
          "Plan your week by dragging project tasks onto an hourly Monday–Sunday timetable. One personal board for every project.",
      },
      { property: "og:title", content: "Mini Kanban — Weekly Timetable Planner" },
      {
        property: "og:description",
        content:
          "Drag tasks from a single cross-project task grid onto an hourly weekly timetable.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [authed, setAuthed] = useState(() => Boolean(getAccessToken()));

  useEffect(() => {
    const onUnauthorized = () => setAuthed(false);
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  if (!authed) {
    return <LoginForm onSuccess={() => setAuthed(true)} />;
  }

  return (
    <Board
      onLogout={() => {
        kanbanService.logout();
        setAuthed(false);
      }}
    />
  );
}
