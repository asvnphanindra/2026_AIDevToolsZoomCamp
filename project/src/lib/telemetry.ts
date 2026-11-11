/**
 * Browser telemetry: shared W3C-style trace ids for auth / demo-seed paths.
 * Posts structured events to the obs service (Compose). No credentials / PII.
 */

const OBS_URL = (
  import.meta.env.VITE_OBS_URL as string | undefined
)?.replace(/\/$/, "");

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function newTraceId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

export function newSpanId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

export type TelemetryEvent = {
  name: string;
  kind?: string;
  ok?: boolean;
  status?: "ok" | "error";
  reason?: string;
  traceId?: string;
  attributes?: Record<string, string | number | boolean>;
};

/** Fire-and-forget ingest; never throws into UI flows. */
export async function reportTelemetry(event: TelemetryEvent): Promise<string> {
  const traceId = event.traceId || newTraceId();
  const spanId = newSpanId();
  const payload = {
    ...event,
    traceId,
    spanId,
    ts: new Date().toISOString(),
  };

  // Always leave a console breadcrumb (no secrets).
  console.info(
    JSON.stringify({
      service: "work-planner-web",
      message: `client.${event.name}`,
      trace_id: traceId,
      span_id: spanId,
      ok: event.ok !== false,
      kind: event.kind || event.name,
    }),
  );

  if (!OBS_URL || typeof fetch !== "function") return traceId;

  try {
    await fetch(`${OBS_URL}/ingest`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-trace-id": traceId,
        traceparent: `00-${traceId}-${spanId}-01`,
      },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // Obs stack optional when running UI-only.
  }
  return traceId;
}
