/**
 * One-command test entry: unit tests, then emulator integration tests.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { envWithJava } from "./resolve-java.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { env } = envWithJava(process.env);

function run(label, commandLine) {
  console.log(`\n==> ${label}\n`);
  const result = spawnSync(commandLine, {
    cwd: root,
    env,
    stdio: "inherit",
    shell: true,
  });
  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("unit tests", "npx vitest run --config vitest.config.ts");
run(
  "integration tests (Firebase emulators)",
  "node scripts/run-integration.mjs",
);

console.log("\nAll tests passed.\n");
