import { useMemo, useState } from "react";
import type { SeedArea } from "@/data/fictional-seed";
import type { PlacedBlock } from "@/lib/blocks";
import type { DayGridModel } from "@/lib/day-grid";
import type { DailyRule } from "@/lib/rules";
import {
  nextSuggestionSlot,
  suggestFor,
  type Suggestion,
} from "@/lib/suggest";

type Props = {
  dateKey: string;
  model: Pick<
    DayGridModel,
    "startHour" | "endHour" | "items" | "bands" | "dayTypes" | "timezone"
  >;
  rules: DailyRule[];
  areas: SeedArea[];
  placedBlocks: PlacedBlock[];
  onPlacedBlocksChange: (blocks: PlacedBlock[]) => void;
};

function formatRange(start: string, end: string): string {
  const fmt = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    const d = new Date();
    d.setHours(h!, m!, 0, 0);
    return d.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };
  return `${fmt(start)}–${fmt(end)}`;
}

/** One-tap Accept / Other slot for unmet required daily rules (Phase 4.6). */
export function SuggestionChips({
  dateKey,
  model,
  rules,
  areas,
  placedBlocks,
  onPlacedBlocksChange,
}: Props) {
  const base = useMemo(
    () => suggestFor(dateKey, model, rules),
    [dateKey, model, rules],
  );
  const [overrides, setOverrides] = useState<
    Record<string, { start: string; end: string; band: Suggestion["band"] }>
  >({});
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());

  const chips = base
    .filter((s) => !dismissed.has(s.ruleId))
    .map((s) => {
      const o = overrides[s.ruleId];
      return o ? { ...s, start: o.start, end: o.end, band: o.band } : s;
    });

  if (!chips.length) return null;

  function accept(s: Suggestion) {
    const area = areas.find((a) => a.id === s.areaId);
    const block: PlacedBlock = {
      id: `suggest-${s.ruleId}-${dateKey}-${Date.now()}`,
      taskId: "",
      title: s.label,
      areaId: s.areaId,
      colour: area?.colour ?? "#0F6B4C",
      date: dateKey,
      start: s.start,
      end: s.end,
      deepWork: /deep|focus/i.test(s.label),
    };
    onPlacedBlocksChange([...placedBlocks, block]);
    setDismissed((prev) => new Set(prev).add(s.ruleId));
  }

  function other(s: Suggestion) {
    const original = base.find((b) => b.ruleId === s.ruleId);
    if (!original) return;
    const next = nextSuggestionSlot(original, s.start);
    setOverrides((prev) => ({ ...prev, [s.ruleId]: next }));
  }

  return (
    <div className="suggestion-chips" role="list" aria-label="Suggestions">
      {chips.map((s) => (
        <div key={s.ruleId} className="suggestion-chip" role="listitem">
          <span className="suggestion-chip-text">
            Place {s.label} {formatRange(s.start, s.end)}?
          </span>
          <div className="suggestion-chip-actions">
            <button
              type="button"
              className="tap-target"
              onClick={() => accept(s)}
            >
              Accept
            </button>
            {s.alternates.length || overrides[s.ruleId] ? (
              <button
                type="button"
                className="tap-target secondary"
                onClick={() => other(s)}
              >
                Other slot
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
