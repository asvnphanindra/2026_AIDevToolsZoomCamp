/**
 * Local start: Auth + Firestore emulators (when JDK available) + Vite.
 * - Reuses a healthy Auth+Firestore suite if already up
 * - Else picks free ports, writes firebase.runtime.json + .env.local
 * - Resolves java from PATH / JAVA_HOME / common Windows JDK installs
 * - Without JDK: Auth-only fallback (Firestore Emulator UI will say "not running")
 * - Vite keeps running if the emulator exits (no -k)
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const AUTH_CANDIDATES = [9099, 9100, 9101, 9102, 9103];
const FIRESTORE_CANDIDATES = [8080, 8081, 8082, 8083];
const UI_CANDIDATES = [4000, 4001, 4002, 4003];

function probeListen(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

function probeTcp(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port }, () => {
      socket.end();
      resolve(true);
    });
    socket.setTimeout(400);
    socket.on("timeout", () => {
      socket.destroy();
    });
    socket.on("error", () => resolve(false));
  });
}

function probeAuth(port) {
  return new Promise((resolve) => {
    const req = http.get(
      { host: "127.0.0.1", port, path: "/", timeout: 400 },
      (res) => {
        res.resume();
        resolve(res.statusCode !== undefined);
      },
    );
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

function javaWorks(javaBin, env = process.env) {
  const result = spawnSync(javaBin, ["-version"], {
    encoding: "utf8",
    shell: false,
    env,
  });
  return result.status === 0;
}

function expandGlobs(patterns) {
  const out = [];
  for (const pattern of patterns) {
    if (!pattern.includes("*")) {
      out.push(pattern);
      continue;
    }
    const star = pattern.indexOf("*");
    const prefix = pattern.slice(0, star);
    const suffix = pattern.slice(star + 1);
    const parent = path.dirname(prefix.endsWith(path.sep) ? prefix : prefix);
    const basePrefix = path.basename(prefix);
    try {
      for (const entry of fs.readdirSync(parent, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        if (basePrefix && !entry.name.startsWith(basePrefix)) continue;
        out.push(path.join(parent, entry.name, suffix.replace(/^[\\/]/, "")));
      }
    } catch {
      /* missing install root */
    }
  }
  return out;
}

/** Prefer PATH/JAVA_HOME; also find Microsoft/Temurin/JetBrains JDKs (Windows). */
function resolveJava() {
  if (javaWorks("java")) {
    return { javaBin: "java", javaHome: process.env.JAVA_HOME || null };
  }

  const home = process.env.JAVA_HOME;
  if (home) {
    const candidate = path.join(home, "bin", process.platform === "win32" ? "java.exe" : "java");
    if (fs.existsSync(candidate) && javaWorks(candidate)) {
      return { javaBin: candidate, javaHome: home };
    }
  }

  const pf = process.env.ProgramFiles || "C:\\Program Files";
  const javaName = process.platform === "win32" ? "java.exe" : "java";
  const patterns = [
    path.join(pf, "Microsoft", "jdk-21*", "bin", javaName),
    path.join(pf, "Eclipse Adoptium", "jdk-21*", "bin", javaName),
    path.join(pf, "Java", "jdk-21*", "bin", javaName),
    path.join(pf, "JetBrains", "*", "jbr", "bin", javaName),
  ];

  for (const candidate of expandGlobs(patterns)) {
    if (fs.existsSync(candidate) && javaWorks(candidate)) {
      return {
        javaBin: candidate,
        javaHome: path.resolve(path.dirname(candidate), ".."),
      };
    }
  }

  return null;
}

function envKey(env, name) {
  return Object.keys(env).find((k) => k.toLowerCase() === name.toLowerCase()) || name;
}

function emulatorEnv(javaInfo) {
  const env = { ...process.env };
  if (!javaInfo?.javaHome) return env;
  // Windows process.env is case-insensitive, but a spread object can keep
  // both `Path` and `PATH`; cmd.exe children must see a single updated Path.
  const javaHomeKey = envKey(env, "JAVA_HOME");
  const pathKey = envKey(env, "PATH");
  env[javaHomeKey] = javaInfo.javaHome;
  if (pathKey !== "PATH" && Object.prototype.hasOwnProperty.call(env, "PATH")) {
    delete env.PATH;
  }
  env[pathKey] = `${path.join(javaInfo.javaHome, "bin")}${path.delimiter}${env[pathKey] || ""}`;
  return env;
}

async function pickFreePort(candidates, label) {
  for (const port of candidates) {
    if (await probeListen(port)) return port;
  }
  throw new Error(
    `No free ${label} port in ${candidates.join(", ")}. Free one and retry.`,
  );
}

async function findHealthySuite() {
  for (const authPort of AUTH_CANDIDATES) {
    if (!(await probeAuth(authPort))) continue;
    for (const firestorePort of FIRESTORE_CANDIDATES) {
      if (await probeTcp(firestorePort)) {
        let uiPort = UI_CANDIDATES[0];
        for (const candidate of UI_CANDIDATES) {
          if (await probeTcp(candidate)) {
            uiPort = candidate;
            break;
          }
        }
        return { authPort, firestorePort, uiPort, reuse: true, withFirestore: true };
      }
    }
    return {
      authPort,
      firestorePort: null,
      uiPort: null,
      reuse: true,
      withFirestore: false,
      authOnly: true,
    };
  }
  return null;
}

async function pickFreshPorts() {
  const authPort = await pickFreePort(AUTH_CANDIDATES, "Auth emulator");
  const firestorePort = await pickFreePort(
    FIRESTORE_CANDIDATES,
    "Firestore emulator",
  );
  const uiPort = await pickFreePort(UI_CANDIDATES, "Emulator UI");
  return { authPort, firestorePort, uiPort, reuse: false, withFirestore: true };
}

function writeRuntimeConfig({ authPort, firestorePort, uiPort, withFirestore }) {
  const base = JSON.parse(
    fs.readFileSync(path.join(root, "firebase.json"), "utf8"),
  );
  base.emulators = base.emulators || {};
  base.emulators.auth = {
    ...(base.emulators.auth || {}),
    host: "127.0.0.1",
    port: authPort,
  };
  if (withFirestore && firestorePort != null) {
    base.emulators.firestore = {
      ...(base.emulators.firestore || {}),
      host: "127.0.0.1",
      port: firestorePort,
    };
  }
  if (uiPort != null) {
    base.emulators.ui = {
      ...(base.emulators.ui || {}),
      enabled: true,
      host: "127.0.0.1",
      port: uiPort,
    };
  }
  const runtimePath = path.join(root, "firebase.runtime.json");
  fs.writeFileSync(runtimePath, `${JSON.stringify(base, null, 2)}\n`);

  const envLocal = path.join(root, ".env.local");
  const authUrl = `http://127.0.0.1:${authPort}`;
  const lines = [
    `# Generated by scripts/dev-start.mjs — do not commit`,
    `VITE_FIREBASE_AUTH_EMULATOR_URL=${authUrl}`,
    `VITE_USE_EMULATORS=true`,
  ];
  if (withFirestore && firestorePort != null) {
    lines.push(`VITE_FIRESTORE_EMULATOR_HOST=127.0.0.1`);
    lines.push(`VITE_FIRESTORE_EMULATOR_PORT=${firestorePort}`);
  }
  lines.push("");
  fs.writeFileSync(envLocal, lines.join("\n"));
  return { runtimePath, authUrl };
}

function run(commandLine, name, env = process.env) {
  const child = spawn(commandLine, {
    cwd: root,
    stdio: "inherit",
    shell: true,
    env,
  });
  child.on("exit", (code, signal) => {
    const why = signal ? `signal ${signal}` : `code ${code ?? 0}`;
    console.log(`\n[${name}] exited (${why})`);
    if (name === "web") {
      process.exit(code ?? 0);
    } else {
      console.warn(
        `[emu] Emulators stopped — Vite keeps running; Try demo uses offline local session if needed.`,
      );
    }
  });
  return child;
}

const javaInfo = resolveJava();
const javaOk = Boolean(javaInfo);
const childEnv = emulatorEnv(javaInfo);
const healthy = await findHealthySuite();

let plan;
if (healthy?.reuse && healthy.withFirestore) {
  plan = healthy;
} else if (healthy?.authOnly && !javaOk) {
  plan = { ...healthy, withFirestore: false };
} else if (healthy?.authOnly && javaOk) {
  console.warn(
    `[start] Auth-only emulator is up on :${healthy.authPort} without Firestore.`,
  );
  console.warn(
    `[start] Stop that process (Ctrl+C in its terminal), then re-run npm start so Auth+Firestore start together.`,
  );
  console.warn(
    `[start] Trying free ports for a full suite; Auth reuse skipped.`,
  );
  plan = await pickFreshPorts();
} else if (!javaOk) {
  console.warn(
    `[start] JDK 21+ not found (PATH / JAVA_HOME / common installs).`,
  );
  console.warn(
    `[start] Windows: winget install --id Microsoft.OpenJDK.21 -e`,
  );
  console.warn(
    `[start] Then open a new terminal. Starting Auth-only — Emulator UI → Firestore will say not running.`,
  );
  const authPort = await pickFreePort(AUTH_CANDIDATES, "Auth emulator");
  const uiPort = await pickFreePort(UI_CANDIDATES, "Emulator UI");
  plan = {
    authPort,
    firestorePort: null,
    uiPort,
    reuse: false,
    withFirestore: false,
  };
} else {
  if (javaInfo.javaHome) {
    console.log(`[start] Using JDK at ${javaInfo.javaHome}`);
  }
  plan = await pickFreshPorts();
}

const { runtimePath, authUrl } = writeRuntimeConfig(plan);
const only = plan.withFirestore ? "auth,firestore" : "auth";

if (plan.reuse && plan.withFirestore) {
  console.log(
    `[start] Reusing Auth ${authUrl} + Firestore :${plan.firestorePort} (UI :${plan.uiPort})`,
  );
} else if (plan.reuse && !plan.withFirestore) {
  console.log(`[start] Reusing Auth emulator at ${authUrl} (Firestore not running)`);
} else {
  console.log(
    plan.withFirestore
      ? `[start] Starting Auth+Firestore at ${authUrl} / :${plan.firestorePort} (Emulator UI :${plan.uiPort})`
      : `[start] Starting Auth emulator at ${authUrl} (Emulator UI :${plan.uiPort})`,
  );
}
console.log(`[start] Vite will keep running even if the emulator fails.`);
if (plan.withFirestore) {
  console.log(
    `[start] Firestore view: http://127.0.0.1:${plan.uiPort} → Firestore`,
  );
}

const kids = [];
if (!plan.reuse) {
  kids.push(
    run(
      `npx firebase emulators:start --only ${only} --project work-planner-demo --config ${path.basename(runtimePath)}`,
      "emu",
      childEnv,
    ),
  );
}
kids.push(run("npx vite", "web", childEnv));

function shutdown() {
  for (const kid of kids) {
    if (!kid.killed) kid.kill("SIGTERM");
  }
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
