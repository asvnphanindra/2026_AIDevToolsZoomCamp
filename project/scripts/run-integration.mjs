/**
 * Run integration vitest against Auth+Firestore emulators.
 * Reuses a healthy suite already on firebase.json ports; otherwise
 * starts one via `firebase emulators:exec`.
 */
import http from "node:http";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { envWithJava } from "./resolve-java.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { env } = envWithJava(process.env);

const AUTH_PORT = Number(process.env.VITE_FIREBASE_AUTH_EMULATOR_PORT || 9099);
const FIRESTORE_PORT = Number(process.env.VITE_FIRESTORE_EMULATOR_PORT || 8080);
const AUTH_URL =
  process.env.VITE_FIREBASE_AUTH_EMULATOR_URL || `http://127.0.0.1:${AUTH_PORT}`;
const FIRESTORE_HOST =
  process.env.VITE_FIRESTORE_EMULATOR_HOST || "127.0.0.1";

function probeHttp(url, timeoutMs = 500) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      res.resume();
      resolve(res.statusCode !== undefined);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function emulatorsHealthy() {
  const authOk = await probeHttp(`${AUTH_URL}/`);
  const fsOk = await probeHttp(
    `http://${FIRESTORE_HOST}:${FIRESTORE_PORT}/`,
  );
  return authOk && fsOk;
}

function runVitest() {
  const result = spawnSync(
    "npx vitest run --config vitest.integration.config.ts",
    {
      cwd: root,
      env: {
        ...env,
        VITE_USE_EMULATORS: "true",
        VITE_FIREBASE_AUTH_EMULATOR_URL: AUTH_URL,
        VITE_FIRESTORE_EMULATOR_HOST: FIRESTORE_HOST,
        VITE_FIRESTORE_EMULATOR_PORT: String(FIRESTORE_PORT),
      },
      stdio: "inherit",
      shell: true,
    },
  );
  return result.status ?? 1;
}

const healthy = await emulatorsHealthy();
if (healthy) {
  console.log(
    `Reusing Auth (${AUTH_URL}) + Firestore (${FIRESTORE_HOST}:${FIRESTORE_PORT}).`,
  );
  process.exit(runVitest());
}

console.log("Starting Auth + Firestore emulators for integration tests…");
const vitestCmd = "npx vitest run --config vitest.integration.config.ts";
const result = spawnSync(
  `npx firebase emulators:exec --only auth,firestore --project work-planner-demo "${vitestCmd}"`,
  {
    cwd: root,
    env: {
      ...env,
      VITE_USE_EMULATORS: "true",
      VITE_FIREBASE_AUTH_EMULATOR_URL: `http://127.0.0.1:9099`,
      VITE_FIRESTORE_EMULATOR_HOST: "127.0.0.1",
      VITE_FIRESTORE_EMULATOR_PORT: "8080",
    },
    stdio: "inherit",
    shell: true,
  },
);

process.exit(result.status ?? 1);
