/**
 * Resolve a JDK for Firebase Firestore emulator (PATH / JAVA_HOME / common installs).
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

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

export function resolveJava() {
  if (javaWorks("java")) {
    return { javaBin: "java", javaHome: process.env.JAVA_HOME || null };
  }

  const home = process.env.JAVA_HOME;
  if (home) {
    const candidate = path.join(
      home,
      "bin",
      process.platform === "win32" ? "java.exe" : "java",
    );
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
    if (!fs.existsSync(candidate)) continue;
    if (!javaWorks(candidate)) continue;
    return {
      javaBin: candidate,
      javaHome: path.resolve(path.dirname(candidate), ".."),
    };
  }

  return null;
}

export function envWithJava(base = process.env) {
  const resolved = resolveJava();
  if (!resolved) {
    throw new Error(
      "JDK 21+ required for Firestore emulator integration tests. Install OpenJDK 21 and retry.",
    );
  }
  const env = { ...base };
  if (resolved.javaHome) {
    env.JAVA_HOME = resolved.javaHome;
  }
  const binDir = path.dirname(resolved.javaBin);
  env.PATH = `${binDir}${path.delimiter}${env.PATH || env.Path || ""}`;
  if (process.platform === "win32") {
    env.Path = env.PATH;
  }
  return { env, resolved };
}
