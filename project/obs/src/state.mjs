/**
 * In-memory ops state for demo seed health, alerts, and on-call.
 * No credentials or customer PII are stored.
 */

const state = {
  /** When true, demo seed probe fails (user cannot Try demo). */
  demoSeedBroken: false,
  breakReason: null,
  lastProbeAt: null,
  lastProbeOk: true,
  lastProbeTraceId: null,
  alerts: [],
  oncall: {
    awake: false,
    lastWakeAt: null,
    lastAction: null,
    lastTraceId: null,
    remediations: [],
  },
};

export function getState() {
  return state;
}

export function breakDemoSeed(reason = "injected_failure") {
  state.demoSeedBroken = true;
  state.breakReason = reason;
  return state;
}

export function repairDemoSeed() {
  state.demoSeedBroken = false;
  state.breakReason = null;
  return state;
}

export function isDemoSeedBroken() {
  return state.demoSeedBroken;
}

export function noteProbe({ ok, traceId }) {
  state.lastProbeAt = new Date().toISOString();
  state.lastProbeOk = Boolean(ok);
  state.lastProbeTraceId = traceId || null;
}

export function upsertAlert(alert) {
  const existing = state.alerts.find(
    (a) => a.name === alert.name && a.status === "firing",
  );
  if (existing) {
    Object.assign(existing, alert, { updatedAt: new Date().toISOString() });
    return existing;
  }
  const row = {
    id: `alert-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "firing",
    ...alert,
  };
  state.alerts.unshift(row);
  if (state.alerts.length > 50) state.alerts.length = 50;
  return row;
}

export function resolveAlert(name, { traceId, note } = {}) {
  for (const a of state.alerts) {
    if (a.name === name && a.status === "firing") {
      a.status = "resolved";
      a.resolvedAt = new Date().toISOString();
      a.resolveTraceId = traceId || null;
      a.resolveNote = note || null;
      a.updatedAt = a.resolvedAt;
    }
  }
}

export function listAlerts() {
  return state.alerts.slice();
}

export function firingAlerts() {
  return state.alerts.filter((a) => a.status === "firing");
}

export function noteOncallWake({ traceId, action }) {
  state.oncall.awake = true;
  state.oncall.lastWakeAt = new Date().toISOString();
  state.oncall.lastAction = action || null;
  state.oncall.lastTraceId = traceId || null;
}

export function noteRemediation(entry) {
  const row = {
    at: new Date().toISOString(),
    ...entry,
  };
  state.oncall.remediations.unshift(row);
  if (state.oncall.remediations.length > 50) state.oncall.remediations.length = 50;
  state.oncall.awake = false;
  state.oncall.lastAction = entry.action || "remediated";
  return row;
}

export function oncallStatus() {
  return {
    ...state.oncall,
    remediations: state.oncall.remediations.slice(0, 10),
  };
}
