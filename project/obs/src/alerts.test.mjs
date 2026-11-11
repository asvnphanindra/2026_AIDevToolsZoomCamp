import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { evaluateAlerts, DEMO_SEED_ALERT } from "./alerts.mjs";
import { wakeAndRemediate } from "./oncall.mjs";
import {
  breakDemoSeed,
  firingAlerts,
  getState,
  repairDemoSeed,
} from "./state.mjs";
import { startTelemetry, shutdownTelemetry } from "./telemetry.mjs";

describe("alert + on-call remediation", () => {
  before(() => {
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = "http://127.0.0.1:9";
    startTelemetry();
    repairDemoSeed();
  });

  after(async () => {
    repairDemoSeed();
    await shutdownTelemetry();
  });

  it("fires DemoSeedUnavailable on injected break", async () => {
    breakDemoSeed("test");
    const result = await evaluateAlerts({ traceId: "a".repeat(32) });
    assert.equal(result.fired, true);
    assert.equal(result.alert.name, DEMO_SEED_ALERT);
    assert.equal(firingAlerts().length, 1);
  });

  it("on-call wakes and remediates the firing alert", async () => {
    breakDemoSeed("test");
    await evaluateAlerts({ traceId: "b".repeat(32) });
    const out = await wakeAndRemediate({
      traceId: "c".repeat(32),
      alertName: DEMO_SEED_ALERT,
    });
    assert.equal(out.remediated, true);
    assert.equal(getState().demoSeedBroken, false);
    assert.equal(firingAlerts().length, 0);
  });
});
