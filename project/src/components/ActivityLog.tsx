import type { ActivityEntry } from "@/lib/activity-log";

type Props = {
  entries: ActivityEntry[];
};

/** Reverse-chronological activity feed (append-only). */
export function ActivityLog({ entries }: Props) {
  return (
    <section className="activity-log" aria-label="Activity log">
      <div className="day-grid-meta">
        <h2>Activity Log</h2>
        <p className="muted">
          Who changed what — owner and bot actors. Entries are append-only.
        </p>
      </div>
      {entries.length === 0 ? (
        <p className="muted">No activity yet.</p>
      ) : (
        <ul className="activity-log-list">
          {entries.map((entry) => (
            <li key={entry.id} className="activity-log-row">
              <time dateTime={entry.at}>
                {formatWhen(entry.at)}
              </time>
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
