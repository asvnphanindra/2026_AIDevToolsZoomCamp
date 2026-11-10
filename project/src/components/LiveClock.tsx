import { memo } from "react";
import { useSecondClock } from "@/hooks/useSecondClock";

type Props = {
  timeZone?: string;
};

/** 12-hour HH:MM:SS AM/PM — isolated so only this node ticks. */
export const LiveClock = memo(function LiveClock({
  timeZone = "Asia/Kolkata",
}: Props) {
  const now = useSecondClock();
  const label = new Intl.DateTimeFormat("en-IN", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(now);

  return (
    <p className="live-clock" aria-live="polite" title={timeZone}>
      <span className="sr-only">Current time </span>
      {label}
    </p>
  );
});
