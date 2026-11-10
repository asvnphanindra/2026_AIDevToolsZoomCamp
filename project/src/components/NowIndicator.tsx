import { memo } from "react";
import { useSecondClock } from "@/hooks/useSecondClock";
import { dateKeyInTz } from "@/lib/time";

type Props = {
  timeZone: string;
  startHour: number;
  endHour: number;
  dayCount: number;
  todayIndex: number;
  todayKey: string;
};

/** Current-time line on today’s column — isolated second ticks. */
export const NowIndicator = memo(function NowIndicator({
  timeZone,
  startHour,
  endHour,
  dayCount,
  todayIndex,
  todayKey,
}: Props) {
  const nowMs = useSecondClock();
  const now = new Date(nowMs);
  const date = dateKeyInTz(now, timeZone);
  if (date !== todayKey) return null;

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const second = Number(parts.find((p) => p.type === "second")?.value ?? 0);
  const mins = hour * 60 + minute + second / 60;

  const windowStart = startHour * 60;
  const windowEnd = endHour * 60;
  if (mins < windowStart || mins > windowEnd) return null;

  const topPct = ((mins - windowStart) / (windowEnd - windowStart)) * 100;
  const leftPct = (todayIndex / dayCount) * 100;
  const widthPct = 100 / dayCount;
  const label = new Intl.DateTimeFormat("en-IN", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(now);

  return (
    <div
      className="now-indicator"
      style={{
        top: `${topPct}%`,
        left: `${leftPct}%`,
        width: `${widthPct}%`,
      }}
      aria-hidden
    >
      <span className="now-indicator-dot" />
      <span className="now-indicator-line" />
      <span className="now-indicator-label">{label}</span>
    </div>
  );
});
