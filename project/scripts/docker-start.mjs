/**
 * Docker entrypoint: Auth + Firestore emulators (0.0.0.0) + Vite.
 * Browser on the host reaches published ports at 127.0.0.1.
 */
import { spawn } from "node:child_process";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const AUTH_PORT = 9099;
const FIRESTORE_PORT = 8080;
const UI_PORT = 4000;
const APP_PORT = 5173;

const children = [];

function probeTcp(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port }, () => {
      socket.end();
      resolve(true);
    });
    socket.setTimeout(400);
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => resolve(false));
  });
}

function probeHttp(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const req = http.get({ host, port, path: "/", timeout: 500 }, (res) => {
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

async function waitFor(label, check, attempts = 90, delayMs = 2000) {
  for (let i = 1; i <= attempts; i += 1) {
    if (await check()) {
      console.log(`[docker-start] ${label} ready`);
      return;
    }
    if (i === 1 || i % 5 === 0) {
      console.log(`[docker-start] waiting for ${label} (${i}/${attempts})…`);
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error(`[docker-start] timed out waiting for ${label}`);
}

function run(command, args, name) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  children.push(child);
  child.on("exit", (code, signal) => {
    if (signal) {
      console.log(`[docker-start] ${name} exited via ${signal}`);
    } else if (code !== 0 && code !== null) {
      console.error(`[docker-start] ${name} exited with code ${code}`);
      shutdown(code);
    }
  });
  return child;
}

function shutdown(code = 0) {
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
  process.exit(code);
}

process.on("SIGTERM", () => shutdown(0));
process.on("SIGINT", () => shutdown(0));

console.log("[docker-start] starting Auth + Firestore emulators…");
run(
  "npx",
  [
    "firebase",
    "emulators:start",
    "--only",
    "auth,firestore",
    "--project",
    "work-planner-demo",
    "--config",
    "firebase.docker.json",
  ],
  "emulators",
);

await waitFor("Auth emulator", () => probeHttp(AUTH_PORT));
await waitFor("Firestore emulator", () => probeTcp(FIRESTORE_PORT));
await waitFor("Emulator UI", () => probeHttp(UI_PORT));

console.log(`[docker-start] starting Vite on 0.0.0.0:${APP_PORT}…`);
const vite = run(
  "npx",
  ["vite", "--host", "0.0.0.0", "--port", String(APP_PORT)],
  "vite",
);

vite.on("exit", (code) => {
  shutdown(code ?? 0);
});
