import { newTraceId } from "./ids.mjs";
import { DEMO_SEED_ALERT } from "./alerts.mjs";
import {
  firingAlerts,
  noteOncallWake,
  noteRemediation,
  repairDemoSeed,
  resolveAlert,
} from "./state.mjs";
import {
  recordDemoSeedHealth,
  recordRemediation,
  structuredLog,
  withSharedTrace,
} from "./telemetry.mjs";

/**
 * On-call agent: wakes on a firing user-impact alert and remediates.
 * For DemoSeedUnavailable → clear injected break + mark seed healthy.
 */
export async function wakeAndRemediate({ traceId, alertName } = {}) {
  const tid = traceId || newTraceId();
  return withSharedTrace(tid, "oncall.wake_and_remediate", async ({ traceId: id }) => {
    const firing = firingAlerts();
    const target =
      firing.find((a) => a.name === (alertName || DEMO_SEED_ALERT)) ||
      firing[0];

    if (!target) {
      structuredLog({
        severity: "INFO",
        message: "oncall.no_firing_alerts",
        traceId: id,
      });
      return { remediated: false, reason: "no_firing_alerts" };
    }

    noteOncallWake({ traceId: id, action: `wake:${target.name}` });
    structuredLog({
      severity: "WARN",
      message: "oncall.awake",
      traceId: id,
      attributes: { alert: target.name, alert_id: target.id },
    });

    if (target.name === DEMO_SEED_ALERT) {
      repairDemoSeed();
      recordDemoSeedHealth(true, {
        traceId: id,
        reason: "oncall_repaired_demo_seed",
      });
      resolveAlert(DEMO_SEED_ALERT, {
        traceId: id,
        note: "Cleared demo-seed break; Try demo path healthy again",
      });
      recordRemediation({
        traceId: id,
        alertName: DEMO_SEED_ALERT,
        action: "repair_demo_seed",
      });
      const entry = noteRemediation({
        alert: DEMO_SEED_ALERT,
        action: "repair_demo_seed",
        traceId: id,
      });
      structuredLog({
        severity: "INFO",
        message: "oncall.remediation_complete",
        traceId: id,
        attributes: {
          alert: DEMO_SEED_ALERT,
          action: "repair_demo_seed",
        },
      });
      return { remediated: true, alert: target, entry, traceId: id };
    }

    structuredLog({
      severity: "WARN",
      message: "oncall.unknown_alert",
      traceId: id,
      attributes: { alert: target.name },
    });
    return { remediated: false, reason: "unknown_alert", alert: target };
  });
}

export function startOncallWatcher({ intervalMs = 3000, autoRemediate = true } = {}) {
  const timer = setInterval(async () => {
    const firing = firingAlerts();
    if (!firing.length) return;
    if (!autoRemediate) return;
    try {
      await wakeAndRemediate({
        alertName: firing[0].name,
        traceId: firing[0].traceId || newTraceId(),
      });
    } catch (err) {
      structuredLog({
        severity: "ERROR",
        message: `oncall.watcher_error: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }, intervalMs);
  timer.unref?.();
  return () => clearInterval(timer);
}
