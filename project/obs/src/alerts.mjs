import { newTraceId } from "./ids.mjs";
import {
  firingAlerts,
  isDemoSeedBroken,
  upsertAlert,
} from "./state.mjs";
import {
  recordDemoSeedFailure,
  structuredLog,
  withSharedTrace,
} from "./telemetry.mjs";

export const DEMO_SEED_ALERT = "DemoSeedUnavailable";

/**
 * User-impact alert: anonymous "Try demo" cannot seed planner data.
 * Fires when the demo-seed probe reports broken / unhealthy.
 */
export async function evaluateAlerts({ traceId } = {}) {
  const tid = traceId || newTraceId();
  return withSharedTrace(tid, "alerts.evaluate", async ({ traceId: id }) => {
    if (isDemoSeedBroken()) {
      const already = firingAlerts().some((a) => a.name === DEMO_SEED_ALERT);
      if (!already) {
        recordDemoSeedFailure({
          traceId: id,
          reason: "demo_seed_probe_failed",
        });
        const alert = upsertAlert({
          name: DEMO_SEED_ALERT,
          severity: "critical",
          summary: "Users cannot load the fictional demo seed (Try demo broken)",
          impact: "user",
          traceId: id,
          runbook: "on-call remediates via /oncall/wake or auto-watcher",
        });
        structuredLog({
          severity: "ERROR",
          message: "alert.firing",
          traceId: id,
          attributes: {
            alert: DEMO_SEED_ALERT,
            alert_id: alert.id,
            impact: "user",
          },
        });
        return { fired: true, alert };
      }
      return { fired: false, alert: firingAlerts().find((a) => a.name === DEMO_SEED_ALERT) };
    }
    return { fired: false, alert: null };
  });
}
