import { useMemo, useState } from "react";
import {
  filterActivity,
  type ActivityEntry,
  type ActorRole,
} from "@/lib/activity-log";

type Props = {
  entries: ActivityEntry[];
};

const ROLES: Array<ActorRole | "all"> = ["all", "owner", "bot", "human"];

/** Reverse-chronological activity feed with client-side filters. */
export function ActivityLog({ entries }: Props) {
  const [role, setRole] = useState<ActorRole | "all">("all");
  const [entityType, setEntityType] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [hideNetZero, setHideNetZero] = useState(false);

  const entityTypes = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) {
      if (e.entityType) set.add(e.entityType);
    }
    return ["all", ...[...set].sort()];
  }, [entries]);

  const visible = useMemo(
    () =>
      filterActivity(entries, {
        role,
        entityType,
        from: from || undefined,
        to: to || undefined,
        hideNetZero,
      }),
    [entries, role, entityType, from, to, hideNetZero],
  );

  return (
    <section className="activity-log" aria-label="Activity log">
      <div className="day-grid-meta">
        <h2>Activity Log</h2>
        <p className="muted">
          Who changed what — owner and bot actors. Entries are append-only.
        </p>
      </div>

      <form
        className="activity-filters"
        onSubmit={(e) => e.preventDefault()}
        aria-label="Activity filters"
      >
        <label>
          Actor
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as ActorRole | "all")}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r === "all" ? "All roles" : r}
              </option>
            ))}
          </select>
        </label>
        <label>
          Entity
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
          >
            {entityTypes.map((t) => (
              <option key={t} value={t}>
                {t === "all" ? "All types" : t}
              </option>
            ))}
          </select>
        </label>
        <label>
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          To
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <label className="activity-filter-toggle">
          <input
            type="checkbox"
            checked={hideNetZero}
            onChange={(e) => setHideNetZero(e.target.checked)}
          />
          Hide net-zero (add then delete)
        </label>
      </form>

      {entries.length === 0 ? (
        <p className="muted">No activity yet.</p>
      ) : visible.length === 0 ? (
        <p className="muted">No entries match these filters.</p>
      ) : (
        <ul className="activity-log-list">
          {visible.map((entry) => (
            <li key={entry.id} className="activity-log-row">
              <time dateTime={entry.at}>{formatWhen(entry.at)}</time>
              <div className="activity-log-main">
                <strong>{entry.summary}</strong>
                <span className="muted">
                  {entry.actorLabel} · {entry.actorRole} · {entry.action} ·{" "}
                  {entry.entityType}/{entry.entityId}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
