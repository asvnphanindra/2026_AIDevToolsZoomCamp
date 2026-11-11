import { memo } from "react";
import { useSecondClock } from "@/hooks/useSecondClock";

type Props = {
  timeZone?: string;
};

/** Date + 12-hour HH:MM:SS AM/PM — isolated so only this node ticks. */
export const LiveClock = memo(function LiveClock({
  timeZone = "Asia/Kolkata",
}: Props) {
  const now = useSecondClock();
  const dateLabel = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(now);
  const timeLabel = new Intl.DateTimeFormat("en-IN", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(now);

  return (
    <p className="live-clock" aria-live="polite" title={timeZone}>
      <span className="sr-only">Current date and time </span>
      <span className="live-clock-date">{dateLabel}</span>
      <span className="live-clock-sep" aria-hidden="true">
        {" "}
        ·{" "}
      </span>
      <span className="live-clock-time">{timeLabel}</span>
    </p>
  );
});
