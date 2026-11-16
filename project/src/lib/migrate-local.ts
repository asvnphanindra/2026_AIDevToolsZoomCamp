import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { readAreas } from "@/lib/areas";
import { readAreaGoals } from "@/lib/area-goals";
import { readPlacedBlocks } from "@/lib/blocks";
import { readCalendarEvents } from "@/lib/calendar-events";
import { readCalendarSeries } from "@/lib/calendar-series";
import { readCheckIns } from "@/lib/checkin";
import { db } from "@/lib/firebase";
import { readFocusItems } from "@/lib/focus";
import {
  replaceCheckIns,
  replaceCollection,
  usersRoot,
} from "@/lib/planner-store";
import { readRules } from "@/lib/rules";
import { readBacklog } from "@/lib/tasks";
import { readWeekHorizon } from "@/lib/week-horizon";

export const LOCAL_STORAGE_KEYS = [
  "work-planner.backlog-tasks",
  "work-planner.placed-blocks",
  "work-planner.areas",
  "work-planner.daily-rules",
  "work-planner.focus-items",
  "work-planner.week-horizon",
  "work-planner.calendar-events",
  "work-planner.calendar-series",
  "work-planner.area-goals",
  "work-planner.check-ins",
] as const;

export type MigrateLocalResult = {
  migrated: boolean;
  skipped: boolean;
  counts: Record<string, number>;
};

/** Pure: true when profile already has migratedAt. */
export function alreadyMigrated(data: Record<string, unknown> | undefined): boolean {
  if (!data) return false;
  return data["migratedAt"] != null;
}

/**
 * One-time copy of personal localStorage keys into users/{uid}/…
 * Idempotent: no-ops when users/{uid}.migratedAt is set.
 */
export async function migrateLocalToUsers(uid: string): Promise<MigrateLocalResult> {
  const root = usersRoot(uid);
  const profileRef = doc(db, "users", uid);
  const snap = await getDoc(profileRef);
  if (alreadyMigrated(snap.data())) {
    return { migrated: false, skipped: true, counts: {} };
  }

  const tasks = readBacklog() ?? [];
  const blocks = readPlacedBlocks();
  const areas = readAreas() ?? [];
  const rules = readRules() ?? [];
  const focusItems = readFocusItems() ?? [];
  const weekHorizon = readWeekHorizon() ?? [];
  const events = (readCalendarEvents() ?? []).filter((e) => !e.seriesId);
  const series = readCalendarSeries() ?? [];
  const areaGoals = readAreaGoals() ?? [];
  const checkIns = readCheckIns();

  const counts: Record<string, number> = {
    tasks: tasks.length,
    blocks: blocks.length,
    areas: areas.length,
    rules: rules.length,
    focusItems: focusItems.length,
    weekHorizon: weekHorizon.length,
    events: events.length,
    series: series.length,
    areaGoals: areaGoals.length,
    checkIns: Object.keys(checkIns).length,
  };

  const writes: Array<Promise<void>> = [];
  if (tasks.length) writes.push(replaceCollection(root, "tasks", tasks));
  if (blocks.length) writes.push(replaceCollection(root, "blocks", blocks));
  if (areas.length) writes.push(replaceCollection(root, "areas", areas));
  if (rules.length) writes.push(replaceCollection(root, "rules", rules));
  if (focusItems.length) {
    writes.push(replaceCollection(root, "focusItems", focusItems));
  }
  if (weekHorizon.length) {
    writes.push(
      replaceCollection(
        root,
        "weekHorizon",
        weekHorizon as Array<Record<string, unknown> & { id: string }>,
      ),
    );
  }
  if (events.length) {
    writes.push(
      replaceCollection(
        root,
        "events",
        events as Array<Record<string, unknown> & { id: string }>,
      ),
    );
  }
  if (series.length) {
    writes.push(
      replaceCollection(
        root,
        "series",
        series as Array<Record<string, unknown> & { id: string }>,
      ),
    );
  }
  if (areaGoals.length) {
    writes.push(replaceCollection(root, "areaGoals", areaGoals));
  }
  if (Object.keys(checkIns).length) {
    writes.push(replaceCheckIns(root, checkIns));
  }
  await Promise.all(writes);

  await setDoc(
    profileRef,
    {
      migratedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  return { migrated: true, skipped: false, counts };
}
