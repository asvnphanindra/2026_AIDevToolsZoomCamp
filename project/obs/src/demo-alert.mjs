/**
 * Fire the user-impact DemoSeedUnavailable alert and show on-call remediation.
 *
 * Usage:
 *   node src/demo-alert.mjs
 *   OBS_URL=http://127.0.0.1:8090 node src/demo-alert.mjs
 */

const base = (process.env.OBS_URL || "http://127.0.0.1:8090").replace(/\/$/, "");

async function main() {
  console.log(`[demo-alert] POST ${base}/demo/alert`);
  const res = await fetch(`${base}/demo/alert`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ autoRemediate: true, delayMs: 800 }),
  });
  const body = await res.json();
  console.log(JSON.stringify(body, null, 2));
  console.log(`
Demo:
  1. Grafana UI: ${process.env.GRAFANA_URL || "http://127.0.0.1:3300"}
     - Explore → Tempo/traces: filter service.name = work-planner-obs, look up trace_id ${body.traceId}
     - Explore → Loki/logs: query {service_name="work-planner-obs"} |= "${body.traceId}"
     - Explore → Prometheus/metrics: work_planner_demo_seed_failures_total / work_planner_oncall_remediations_total
  2. Obs status: ${base}/status
  3. Alerts:     ${base}/alerts
`);
  if (!res.ok || !body.remediated) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
