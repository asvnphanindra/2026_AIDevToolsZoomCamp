import { normalizeTraceId, newSpanId } from "./ids.mjs";

const SERVICE_NAME = "work-planner-obs";

const counters = {
  demoSeedFailures: 0,
  userImpactErrors: 0,
  remediations: 0,
};
let lastDemoSeedUp = null;
let lastAuthUp = null;
let exportTimer;
let started = false;

function otlpBase() {
  return (
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.replace(/\/$/, "") ||
    "http://127.0.0.1:4318"
  );
}

function nowNano() {
  const ms = Date.now();
  return BigInt(ms) * 1000000n;
}

function attr(key, value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (Number.isInteger(value)) {
      return { key, value: { intValue: String(value) } };
    }
    return { key, value: { doubleValue: value } };
  }
  if (typeof value === "boolean") {
    return { key, value: { boolValue: value } };
  }
  return { key, value: { stringValue: String(value) } };
}

function resourceAttrs() {
  return [
    attr("service.name", SERVICE_NAME),
    attr("service.version", "0.1.0"),
    attr("deployment.environment", process.env.OBS_ENV || "local"),
  ];
}

function sanitize(attrs) {
  const out = {};
  for (const [k, v] of Object.entries(attrs || {})) {
    const key = String(k).toLowerCase();
    if (
      key.includes("password") ||
      key.includes("token") ||
      key.includes("secret") ||
      key.includes("credential") ||
      key.includes("authorization") ||
      key === "email"
    ) {
      continue;
    }
    if (v === undefined) continue;
    out[k] =
      typeof v === "string" || typeof v === "number" || typeof v === "boolean"
        ? v
        : JSON.stringify(v);
  }
  return out;
}

async function postOtlp(path, body) {
  const url = `${otlpBase()}${path}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      // Collector optional during unit tests / host-only runs.
      await res.text().catch(() => "");
    }
  } catch {
    // Best-effort export.
  }
}

export function startTelemetry() {
  if (started) return;
  started = true;
  const interval = Number(process.env.OBS_METRIC_INTERVAL_MS || 5000);
  exportTimer = setInterval(() => {
    void exportMetrics();
  }, interval);
  exportTimer.unref?.();
}

/** Emit a structured log that always carries the shared trace id. */
export function structuredLog({
  severity = "INFO",
  message,
  traceId,
  spanId,
  attributes = {},
}) {
  const tid = normalizeTraceId(traceId);
  const sid = spanId || newSpanId();
  const level = String(severity).toUpperCase();
  const clean = sanitize(attributes);

  const payload = {
    service: SERVICE_NAME,
    severity: level,
    message,
    trace_id: tid,
    span_id: sid,
    ...clean,
  };
  console.log(JSON.stringify(payload));

  const severityNumber =
    level === "ERROR" ? 17 : level === "WARN" ? 13 : 9;

  void postOtlp("/v1/logs", {
    resourceLogs: [
      {
        resource: { attributes: resourceAttrs() },
        scopeLogs: [
          {
            scope: { name: SERVICE_NAME },
            logRecords: [
              {
                timeUnixNano: nowNano().toString(),
                severityNumber,
                severityText: level,
                body: { stringValue: message },
                attributes: [
                  attr("trace_id", tid),
                  attr("span_id", sid),
                  ...Object.entries(clean).map(([k, v]) => attr(k, v)),
                ],
                traceId: tid,
                spanId: sid,
              },
            ],
          },
        ],
      },
    ],
  });

  return { traceId: tid, spanId: sid };
}

async function exportSpan({
  traceId,
  spanId,
  name,
  startNano,
  endNano,
  ok,
  attributes = {},
  errorMessage,
}) {
  const clean = sanitize(attributes);
  const spanAttrs = [
    attr("trace_id", traceId),
    ...Object.entries(clean).map(([k, v]) => attr(k, v)),
  ];
  await postOtlp("/v1/traces", {
    resourceSpans: [
      {
        resource: { attributes: resourceAttrs() },
        scopeSpans: [
          {
            scope: { name: SERVICE_NAME },
            spans: [
              {
                traceId,
                spanId,
                name,
                kind: 1,
                startTimeUnixNano: startNano.toString(),
                endTimeUnixNano: endNano.toString(),
                attributes: spanAttrs,
                status: ok
                  ? { code: 1 }
                  : {
                      code: 2,
                      message: errorMessage || "error",
                    },
              },
            ],
          },
        ],
      },
    ],
  });
}

async function exportMetrics() {
  const metrics = [
    {
      name: "work_planner_demo_seed_up",
      description: "1 when demo seed path is healthy for users; 0 when broken",
      unit: "1",
      gauge: {
        dataPoints: [
          {
            asInt: String(lastDemoSeedUp === false ? 0 : 1),
            timeUnixNano: nowNano().toString(),
            attributes: [attr("trace_id", "gauge")],
          },
        ],
      },
    },
    {
      name: "work_planner_auth_up",
      description: "1 when Auth emulator/probe is reachable",
      unit: "1",
      gauge: {
        dataPoints: [
          {
            asInt: String(lastAuthUp === false ? 0 : 1),
            timeUnixNano: nowNano().toString(),
          },
        ],
      },
    },
    {
      name: "work_planner_demo_seed_failures_total",
      description: "Count of user-impacting demo seed failures",
      unit: "1",
      sum: {
        aggregationTemporality: 2,
        isMonotonic: true,
        dataPoints: [
          {
            asInt: String(counters.demoSeedFailures),
            startTimeUnixNano: "0",
            timeUnixNano: nowNano().toString(),
          },
        ],
      },
    },
    {
      name: "work_planner_user_impact_errors_total",
      description: "User-impacting errors (auth/demo seed)",
      unit: "1",
      sum: {
        aggregationTemporality: 2,
        isMonotonic: true,
        dataPoints: [
          {
            asInt: String(counters.userImpactErrors),
            startTimeUnixNano: "0",
            timeUnixNano: nowNano().toString(),
          },
        ],
      },
    },
    {
      name: "work_planner_oncall_remediations_total",
      description: "On-call remediations completed",
      unit: "1",
      sum: {
        aggregationTemporality: 2,
        isMonotonic: true,
        dataPoints: [
          {
            asInt: String(counters.remediations),
            startTimeUnixNano: "0",
            timeUnixNano: nowNano().toString(),
          },
        ],
      },
    },
  ];

  await postOtlp("/v1/metrics", {
    resourceMetrics: [
      {
        resource: { attributes: resourceAttrs() },
        scopeMetrics: [
          {
            scope: { name: SERVICE_NAME },
            metrics,
          },
        ],
      },
    ],
  });
}

/**
 * Run work inside a span that uses a forced W3C trace id so
 * metrics / structured logs / traces share the same `trace_id`.
 */
export async function withSharedTrace(traceId, name, fn, attributes = {}) {
  const tid = normalizeTraceId(traceId);
  const spanId = newSpanId();
  const startNano = nowNano();

  structuredLog({
    severity: "INFO",
    message: `span.start ${name}`,
    traceId: tid,
    spanId,
    attributes: { span_name: name, ...attributes },
  });

  try {
    const result = await fn({ traceId: tid, spanId });
    const endNano = nowNano();
    await exportSpan({
      traceId: tid,
      spanId,
      name,
      startNano,
      endNano,
      ok: true,
      attributes: { span_name: name, ...attributes },
    });
    structuredLog({
      severity: "INFO",
      message: `span.ok ${name}`,
      traceId: tid,
      spanId,
      attributes: { span_name: name },
    });
    return result;
  } catch (err) {
    const endNano = nowNano();
    const message = err instanceof Error ? err.message : String(err);
    await exportSpan({
      traceId: tid,
      spanId,
      name,
      startNano,
      endNano,
      ok: false,
      attributes: { span_name: name, ...attributes },
      errorMessage: message,
    });
    structuredLog({
      severity: "ERROR",
      message: `span.error ${name}: ${message}`,
      traceId: tid,
      spanId,
      attributes: { span_name: name },
    });
    throw err;
  }
}

export function recordDemoSeedHealth(up, { traceId, reason } = {}) {
  lastDemoSeedUp = Boolean(up);
  structuredLog({
    severity: up ? "INFO" : "ERROR",
    message: up ? "demo_seed.healthy" : "demo_seed.unhealthy",
    traceId,
    attributes: {
      reason: reason || (up ? "ok" : "failed"),
      metric: "demo_seed_up",
      demo_seed_up: up ? 1 : 0,
    },
  });
}

export function recordDemoSeedFailure({ traceId, reason } = {}) {
  counters.demoSeedFailures += 1;
  counters.userImpactErrors += 1;
  lastDemoSeedUp = false;
  structuredLog({
    severity: "ERROR",
    message: "user_impact.demo_seed_failure",
    traceId,
    attributes: { reason: reason || "unknown", alert_candidate: true },
  });
  void exportMetrics();
}

export function recordAuthHealth(up, { traceId } = {}) {
  lastAuthUp = Boolean(up);
  structuredLog({
    severity: up ? "INFO" : "WARN",
    message: up ? "auth.healthy" : "auth.unhealthy",
    traceId,
    attributes: { metric: "auth_up", auth_up: up ? 1 : 0 },
  });
}

export function recordUserImpactError(kind, { traceId, reason } = {}) {
  counters.userImpactErrors += 1;
  structuredLog({
    severity: "ERROR",
    message: `user_impact.${kind}`,
    traceId,
    attributes: { reason: reason || "unknown", kind: String(kind) },
  });
  void exportMetrics();
}

export function recordRemediation({ traceId, alertName, action } = {}) {
  counters.remediations += 1;
  structuredLog({
    severity: "INFO",
    message: "oncall.remediated",
    traceId,
    attributes: { alert: alertName || "unknown", action: action || "fix" },
  });
  void exportMetrics();
}

export function getHealthSnapshot() {
  return {
    demoSeedUp: lastDemoSeedUp !== false,
    authUp: lastAuthUp !== false,
  };
}

export async function shutdownTelemetry() {
  if (exportTimer) clearInterval(exportTimer);
  await exportMetrics();
  started = false;
}
