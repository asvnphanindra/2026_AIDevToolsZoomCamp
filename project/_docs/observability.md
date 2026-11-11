# Work Planner — Observability, alert, on-call

Certificate criteria: metrics + traces + structured logs sharing a **trace ID**, viewable in a UI; ≥1 user-impact alert; on-call agent wakes and remediates.

## Stack (Compose)

| Service | Role | URL |
|---------|------|-----|
| `stack` | App + Auth/Firestore emulators | http://127.0.0.1:5173 |
| `otel-lgtm` | Grafana + Tempo + Loki + Prometheus + OTLP | http://127.0.0.1:3300 |
| `obs` | OTel-instrumented probes, ingest, alerts, on-call | http://127.0.0.1:8090 |

```powershell
cd project
docker compose up --build
```

No customer credentials or PII are written to telemetry (emails/tokens stripped).

## Shared trace ID

1. Browser (`src/lib/telemetry.ts`) creates a 32-hex W3C trace id on auth / Try demo.
2. Events POST to `obs` `/ingest` with `x-trace-id` + `traceparent`.
3. `obs` opens an OTel span that **inherits that trace id**, emits structured JSON logs with `trace_id`, and records metrics for the same action.
4. In Grafana Explore, search Tempo / Loki by that `trace_id`.

## Metrics (examples)

- `work_planner_demo_seed_up` — gauge, 1 healthy / 0 broken
- `work_planner_demo_seed_failures_total` — counter
- `work_planner_user_impact_errors_total` — counter
- `work_planner_auth_up` — gauge
- `work_planner_oncall_remediations_total` — counter

## User-impact alert

**`DemoSeedUnavailable`** — anonymous **Try demo** cannot seed planner data (injected break or Auth/Firestore probe failure). Actionable: users cannot enter the demo planner.

## On-call agent

`obs` runs a watcher (`OBS_AUTO_REMEDIATE=1` by default). On a firing alert it:

1. Wakes (`oncall.awake` log + `/oncall/status`)
2. Remediates `DemoSeedUnavailable` by clearing the break and re-probing
3. Resolves the alert and increments remediation metrics (same `trace_id`)

Manual wake: `POST http://127.0.0.1:8090/oncall/wake`

## Demo (alert + remediation)

With Compose up, fire **`DemoSeedUnavailable`** and (by default) auto-remediate:

**Exact working request** (must be `POST` or `GET` on `/demo/alert` — not `/alert`, no trailing-slash-only mismatch after normalize):

```powershell
curl.exe -X POST http://127.0.0.1:8090/demo/alert -H "content-type: application/json" -d "{\"autoRemediate\":true}"
```

On Windows PowerShell use **`curl.exe`** (plain `curl` is `Invoke-WebRequest` and often yields `{"error":"not_found"}` from a GET). Browser/open: `http://127.0.0.1:8090/demo/alert` (GET also works). Route index: `GET http://127.0.0.1:8090/`.

Or from `project/obs`: `npm run demo:alert` (Node 20+; Compose must be up).

Then open Grafana → Explore:

- **Tempo**: service `work-planner-obs`, look up the returned `traceId`
- **Loki**: `{service_name="work-planner-obs"} |= "<traceId>"`
- **Prometheus**: `work_planner_demo_seed_failures_total`, `work_planner_oncall_remediations_total`

Stepwise (break without auto-fix):

```powershell
curl.exe -X POST http://127.0.0.1:8090/demo/break
curl.exe http://127.0.0.1:8090/alerts
# watcher remediates within ~3s, or:
curl.exe -X POST http://127.0.0.1:8090/oncall/wake
curl.exe http://127.0.0.1:8090/status
```

## Local obs without full Compose UI

```powershell
cd project\obs
npm start
```

OTLP export is best-effort if the collector is unreachable; structured console logs still include `trace_id`. In Compose, `obs` reaches the collector at `http://otel-lgtm:4318` on the internal network (OTLP ports are not published on the host).
