import { useState } from "react";
import type { CheckInOutcome } from "@/lib/checkin";

type Props = {
  title: string;
  start: string;
  end: string;
  onSubmit: (outcome: CheckInOutcome, remainingMin?: number) => void;
  onLater: () => void;
};

/** US-D1 — Done / Partly / Not done after block end (never auto-done). */
export function CheckInPrompt({
  title,
  start,
  end,
  onSubmit,
  onLater,
}: Props) {
  const [partlyOpen, setPartlyOpen] = useState(false);
  const [remaining, setRemaining] = useState(15);

  function submitPartly() {
    if (!Number.isFinite(remaining) || remaining < 1) return;
    onSubmit("partly", Math.round(remaining));
  }

  return (
    <div className="checkin-banner" role="dialog" aria-label="Block check-in">
      <p>
        Check in: <strong>{title}</strong> ({start}–{end}). Nothing is marked
        done automatically.
      </p>
      {partlyOpen ? (
        <div className="checkin-partly">
          <label>
            Remaining minutes
            <input
              type="number"
              min={1}
              step={5}
              value={remaining}
              onChange={(e) => setRemaining(Number(e.target.value))}
            />
          </label>
          <div className="actions">
            <button type="button" onClick={submitPartly}>
              Save partly done
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => setPartlyOpen(false)}
            >
              Back
            </button>
          </div>
        </div>
      ) : (
        <div className="actions">
          <button type="button" onClick={() => onSubmit("done")}>
            Done
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => setPartlyOpen(true)}
          >
            Partly done
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => onSubmit("not-done")}
          >
            Not done
          </button>
          <button type="button" className="secondary" onClick={onLater}>
            Later
          </button>
        </div>
      )}
    </div>
  );
}
