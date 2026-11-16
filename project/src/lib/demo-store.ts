/**
 * Demo-mode facade over planner-store (root demo/{uid}).
 * Prefer planner-store directly for personal users/{uid}.
 */
import type { BlockCheckIn } from "@/lib/checkin";
import {
  demoRoot,
  loadPlannerState,
  replaceCheckIns,
  replaceCollection,
  type PlannerState,
} from "@/lib/planner-store";

export type DemoPlannerState = PlannerState;

export async function replaceDemoCollection(
  uid: string,
  name: string,
  rows: Array<Record<string, unknown> & { id: string }>,
): Promise<void> {
  await replaceCollection(demoRoot(uid), name, rows);
}

export async function replaceDemoCheckIns(
  uid: string,
  map: Record<string, BlockCheckIn>,
): Promise<void> {
  await replaceCheckIns(demoRoot(uid), map);
}

/** Load mutable planner state from demo/{uid}/… (after seed). */
export async function loadDemoPlannerState(
  uid: string,
): Promise<DemoPlannerState> {
  return loadPlannerState(demoRoot(uid));
}
