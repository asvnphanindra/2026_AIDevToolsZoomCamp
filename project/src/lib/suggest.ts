import type { EnergyLevel } from "@/data/fictional-seed";
import { addMinutes, durationMinutes } from "@/lib/blocks";
import type { DayGridModel } from "@/lib/day-grid";
import { freeSlots, type FreeSlot, type TaskDepth } from "@/lib/free-slots";
import {
  evaluateDayRules,
  isRequiredRule,
  type DailyRule,
} from "@/lib/rules";
import { minutesOf, weekdaySun0 } from "@/lib/time";

export type Suggestion = {
  ruleId: string;
  areaId: string;
  label: string;
  minutes: number;
  start: string;
  end: string;
  band: EnergyLevel;
  /** Ranked alternates (same duration), excluding the primary. */
  alternates: Array<{ start: string; end: string; band: EnergyLevel }>;
};

const BAND_SCORE: Record<EnergyLevel, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

function preferredDepth(rule: DailyRule): TaskDepth {
  const label = (rule.label || "").toLowerCase();
  if (/deep|focus|research|write/.test(label)) return "deep";
  if (/listen|commute|review/.test(label)) return "listen";
  return "shallow";
}

function clipToOutsideWindow(
  slot: FreeSlot,
  minutes: number,
  outsideWindow?: { start: string; end: string },
): Array<{ start: string; end: string; band: EnergyLevel }> {
  const need = minutes;
  const candidates: Array<{ start: string; end: string; band: EnergyLevel }> =
    [];
  const s0 = minutesOf(slot.start);
  const e0 = minutesOf(slot.end);
  if (!outsideWindow) {
    if (e0 - s0 < need) return [];
    return [
      {
        start: slot.start,
        end: addMinutes(slot.start, need),
        band: slot.band,
      },
    ];
  }
  const wStart = minutesOf(outsideWindow.start);
  const wEnd = minutesOf(outsideWindow.end);
  // Prefer placement entirely before the window
  if (wStart - s0 >= need) {
    candidates.push({
      start: slot.start,
      end: addMinutes(slot.start, need),
      band: slot.band,
    });
  }
  // Or entirely after
  if (e0 - wEnd >= need) {
    candidates.push({
      start: formatFromMins(wEnd),
      end: formatFromMins(wEnd + need),
      band: slot.band,
    });
  }
  return candidates;
}

function formatFromMins(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function scorePlacement(
  start: string,
  band: EnergyLevel,
  depth: TaskDepth,
  allowedDepths: TaskDepth[],
): number {
  if (!allowedDepths.includes(depth)) return -Infinity;
  let score = BAND_SCORE[band];
  if (depth === "deep" && band === "high") score += 2;
  if (depth === "deep" && band === "low") score -= 2;
  // Prefer late afternoon / evening for leftover deep focus when high is gone
  const h = minutesOf(start) / 60;
  if (depth === "deep" && h >= 19 && h < 22) score += 1;
  if (h >= 6 && h < 8) score += 0.5;
  return score;
}

/**
 * Best free slot per unmet required daily rule. Never auto-places (Phase 4.5).
 */
export function suggestFor(
  dateKey: string,
  model: Pick<
    DayGridModel,
    "startHour" | "endHour" | "items" | "bands" | "dayTypes" | "timezone"
  >,
  rules: DailyRule[],
): Suggestion[] {
  const weekday = weekdaySun0(dateKey, model.timezone);
  const required = rules.filter(isRequiredRule);
  const shortfalls = evaluateDayRules(
    dateKey,
    required,
    model.items,
    weekday,
  );
  if (!shortfalls.length) return [];

  const suggestions: Suggestion[] = [];
  // Track tentatively reserved ranges so multiple rules don't pick the same gap
  const reserved: Array<{ start: string; end: string }> = [];

  for (const short of shortfalls) {
    const rule = required.find((r) => r.id === short.ruleId);
    if (!rule) continue;
    const minutes = short.missing;
    if (minutes < 15) continue;
    const depth = preferredDepth(rule);

    const modelWithReserved = {
      ...model,
      items: [
        ...model.items,
        ...reserved.map((r, i) => ({
          id: `reserved-${i}`,
          date: dateKey,
          title: "reserved",
          start: r.start,
          end: r.end,
          kind: "block" as const,
          colour: "#000",
        })),
      ],
    };

    const gaps = freeSlots(dateKey, modelWithReserved, {
      minMinutes: minutes,
    });
    const ranked: Array<{
      start: string;
      end: string;
      band: EnergyLevel;
      score: number;
    }> = [];

    for (const gap of gaps) {
      const placements = clipToOutsideWindow(
        gap,
        minutes,
        rule.outsideWindow,
      );
      for (const p of placements) {
        // Reject if overlaps outsideWindow at all
        if (rule.outsideWindow) {
          const oS = minutesOf(rule.outsideWindow.start);
          const oE = minutesOf(rule.outsideWindow.end);
          if (minutesOf(p.start) < oE && minutesOf(p.end) > oS) continue;
        }
        if (durationMinutes(p.start, p.end) < minutes) continue;
        const score = scorePlacement(
          p.start,
          p.band,
          depth,
          gap.allowedDepths,
        );
        if (score === -Infinity) continue;
        ranked.push({ ...p, score });
      }
    }

    ranked.sort(
      (a, b) =>
        b.score - a.score || minutesOf(a.start) - minutesOf(b.start),
    );
    const best = ranked[0];
    if (!best) continue;

    reserved.push({ start: best.start, end: best.end });
    suggestions.push({
      ruleId: short.ruleId,
      areaId: short.areaId,
      label: short.label,
      minutes,
      start: best.start,
      end: best.end,
      band: best.band,
      alternates: ranked.slice(1, 6).map(({ start, end, band }) => ({
        start,
        end,
        band,
      })),
    });
  }

  return suggestions;
}

/** Cycle to the next alternate (wraps to primary). */
export function nextSuggestionSlot(
  suggestion: Suggestion,
  currentStart: string,
): { start: string; end: string; band: EnergyLevel } {
  const chain = [
    { start: suggestion.start, end: suggestion.end, band: suggestion.band },
    ...suggestion.alternates,
  ];
  const idx = chain.findIndex((c) => c.start === currentStart);
  const next = chain[(idx + 1) % chain.length]!;
  return next;
}
