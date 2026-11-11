import http from "node:http";
import net from "node:net";
import { newTraceId } from "./ids.mjs";
import { isDemoSeedBroken, noteProbe } from "./state.mjs";
import {
  recordAuthHealth,
  recordDemoSeedHealth,
  withSharedTrace,
} from "./telemetry.mjs";

function probeTcp(host, port, timeoutMs = 500) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port }, () => {
      socket.end();
      resolve(true);
    });
    socket.setTimeout(timeoutMs);
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => resolve(false));
  });
}

function probeHttp(host, port, path = "/", timeoutMs = 800) {
  return new Promise((resolve) => {
    const req = http.get({ host, port, path, timeout: timeoutMs }, (res) => {
      res.resume();
      resolve(res.statusCode !== undefined && res.statusCode < 500);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Probe Auth reachability + demo-seed readiness.
 * Demo seed is "down" when intentionally broken (alert demo) or when
 * Auth is unreachable in compose (users cannot Try demo against emulators).
 */
export async function runHealthProbe({ traceId } = {}) {
  const tid = traceId || newTraceId();
  return withSharedTrace(tid, "probe.health", async ({ traceId: id }) => {
    const authHost = process.env.AUTH_PROBE_HOST || "127.0.0.1";
    const authPort = Number(process.env.AUTH_PROBE_PORT || 9099);
    const fsHost = process.env.FIRESTORE_PROBE_HOST || "127.0.0.1";
    const fsPort = Number(process.env.FIRESTORE_PROBE_PORT || 8080);

    const authOk = await probeHttp(authHost, authPort);
    const firestoreOk = await probeTcp(fsHost, fsPort);

    recordAuthHealth(authOk, { traceId: id });

    const injectedBreak = isDemoSeedBroken();
    const demoOk = !injectedBreak && authOk && firestoreOk;
    recordDemoSeedHealth(demoOk, {
      traceId: id,
      reason: injectedBreak
        ? "injected_break"
        : !authOk
          ? "auth_down"
          : !firestoreOk
            ? "firestore_down"
            : "ok",
    });
    noteProbe({ ok: demoOk, traceId: id });

    return {
      traceId: id,
      authOk,
      firestoreOk,
      demoSeedOk: demoOk,
      injectedBreak,
    };
  });
}

export function startProbeLoop({ intervalMs = 10000 } = {}) {
  const tick = () => {
    runHealthProbe().catch(() => {});
  };
  tick();
  const timer = setInterval(tick, intervalMs);
  timer.unref?.();
  return () => clearInterval(timer);
}
