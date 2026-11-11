import http from "node:http";
import { evaluateAlerts, DEMO_SEED_ALERT } from "./alerts.mjs";
import { newTraceId, normalizeTraceId } from "./ids.mjs";
import { wakeAndRemediate, startOncallWatcher } from "./oncall.mjs";
import { runHealthProbe, startProbeLoop } from "./probe.mjs";
import {
  breakDemoSeed,
  getState,
  listAlerts,
  oncallStatus,
  firingAlerts,
} from "./state.mjs";
import {
  recordUserImpactError,
  shutdownTelemetry,
  startTelemetry,
  structuredLog,
  withSharedTrace,
} from "./telemetry.mjs";

const PORT = Number(process.env.OBS_PORT || 8090);
const HOST = process.env.OBS_HOST || "0.0.0.0";

startTelemetry();
startProbeLoop({ intervalMs: Number(process.env.OBS_PROBE_INTERVAL_MS || 10000) });
startOncallWatcher({
  intervalMs: Number(process.env.OBS_ONCALL_INTERVAL_MS || 3000),
  autoRemediate: process.env.OBS_AUTO_REMEDIATE !== "0",
});

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function send(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type, traceparent, x-trace-id",
  });
  res.end(payload);
}

function cors(res) {
  res.writeHead(204, {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type, traceparent, x-trace-id",
  });
  res.end();
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const path = url.pathname;

  if (req.method === "OPTIONS") return cors(res);

  try {
    if (req.method === "GET" && path === "/health") {
      return send(res, 200, {
        ok: true,
        service: "work-planner-obs",
        demoSeedBroken: getState().demoSeedBroken,
      });
    }

    if (req.method === "GET" && path === "/status") {
      return send(res, 200, {
        probe: {
          lastProbeAt: getState().lastProbeAt,
          lastProbeOk: getState().lastProbeOk,
          lastProbeTraceId: getState().lastProbeTraceId,
          demoSeedBroken: getState().demoSeedBroken,
        },
        alerts: listAlerts().slice(0, 10),
        oncall: oncallStatus(),
      });
    }

    if (req.method === "GET" && path === "/alerts") {
      return send(res, 200, { alerts: listAlerts() });
    }

    if (req.method === "GET" && path === "/oncall/status") {
      return send(res, 200, oncallStatus());
    }

    if (req.method === "POST" && path === "/ingest") {
      const body = await readJson(req);
      const traceId = normalizeTraceId(
        body.traceId || req.headers["x-trace-id"] || newTraceId(),
      );
      await withSharedTrace(
        traceId,
        `ingest.${body.name || "event"}`,
        async ({ traceId: id }) => {
          const severity =
            body.status === "error" || body.ok === false ? "ERROR" : "INFO";
          structuredLog({
            severity,
            message: `client.${body.name || "event"}`,
            traceId: id,
            attributes: {
              source: "frontend",
              ok: body.ok !== false,
              kind: body.kind || body.name || "event",
              ...(body.attributes || {}),
            },
          });
          if (body.status === "error" || body.ok === false) {
            recordUserImpactError(body.kind || body.name || "client_error", {
              traceId: id,
              reason: body.reason || "client_reported",
            });
            if (
              body.kind === "demo_seed" ||
              body.name === "demo_seed" ||
              body.name === "signInDemo"
            ) {
              breakDemoSeed(body.reason || "client_reported_demo_seed_failure");
              await evaluateAlerts({ traceId: id });
            }
          }
        },
        { source: "frontend" },
      );
      return send(res, 202, { accepted: true, traceId });
    }

    if (req.method === "POST" && path === "/demo/break") {
      const body = await readJson(req).catch(() => ({}));
      const traceId = normalizeTraceId(body.traceId || newTraceId());
      const result = await withSharedTrace(
        traceId,
        "demo.break_seed",
        async ({ traceId: id }) => {
          breakDemoSeed(body.reason || "manual_demo_break");
          structuredLog({
            severity: "WARN",
            message: "demo.seed_broken_injected",
            traceId: id,
            attributes: { reason: body.reason || "manual_demo_break" },
          });
          await runHealthProbe({ traceId: id });
          return evaluateAlerts({ traceId: id });
        },
      );
      return send(res, 200, {
        broken: true,
        alert: DEMO_SEED_ALERT,
        fired: result.fired,
        traceId,
        alertRecord: result.alert,
      });
    }

    if (req.method === "POST" && path === "/demo/alert") {
      const body = await readJson(req).catch(() => ({}));
      const traceId = normalizeTraceId(body.traceId || newTraceId());
      const auto = body.autoRemediate !== false;
      const result = await withSharedTrace(
        traceId,
        "demo.alert_and_oncall",
        async ({ traceId: id }) => {
          breakDemoSeed("demo_alert_script");
          await runHealthProbe({ traceId: id });
          const evalResult = await evaluateAlerts({ traceId: id });
          let remediation = null;
          if (auto) {
            // Small delay so Grafana/OTLP can receive the firing span first.
            await new Promise((r) => setTimeout(r, Number(body.delayMs || 500)));
            // Watcher may already have remediates; treat resolved alert as success.
            if (!firingAlerts().some((a) => a.name === DEMO_SEED_ALERT)) {
              remediation = {
                remediated: true,
                reason: "already_remediated_by_watcher",
                traceId: id,
              };
            } else {
              remediation = await wakeAndRemediate({
                traceId: id,
                alertName: DEMO_SEED_ALERT,
              });
            }
            await runHealthProbe({ traceId: id });
          }
          return { evalResult, remediation };
        },
      );
      return send(res, 200, {
        alert: DEMO_SEED_ALERT,
        traceId,
        fired: result.evalResult.fired,
        remediated: result.remediation?.remediated === true,
        status: getState(),
        oncall: oncallStatus(),
      });
    }

    if (req.method === "POST" && path === "/oncall/wake") {
      const body = await readJson(req).catch(() => ({}));
      const traceId = normalizeTraceId(body.traceId || newTraceId());
      const out = await wakeAndRemediate({
        traceId,
        alertName: body.alertName || DEMO_SEED_ALERT,
      });
      await runHealthProbe({ traceId });
      return send(res, 200, out);
    }

    if (req.method === "POST" && path === "/probe") {
      const body = await readJson(req).catch(() => ({}));
      const out = await runHealthProbe({
        traceId: body.traceId || newTraceId(),
      });
      const evalResult = await evaluateAlerts({ traceId: out.traceId });
      return send(res, 200, { ...out, alert: evalResult });
    }

    return send(res, 404, { error: "not_found" });
  } catch (err) {
    structuredLog({
      severity: "ERROR",
      message: `http.error: ${err instanceof Error ? err.message : String(err)}`,
    });
    return send(res, 500, {
      error: "internal",
      message: err instanceof Error ? err.message : String(err),
    });
  }
});

server.listen(PORT, HOST, () => {
  structuredLog({
    severity: "INFO",
    message: "obs.listening",
    attributes: {
      host: HOST,
      port: PORT,
      otlp:
        process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://127.0.0.1:4318",
      grafana: process.env.GRAFANA_URL || "http://127.0.0.1:3300",
      autoRemediate: process.env.OBS_AUTO_REMEDIATE !== "0",
    },
  });
});

async function shutdown() {
  server.close();
  await shutdownTelemetry();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
