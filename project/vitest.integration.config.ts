import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    name: "integration",
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 60_000,
    env: {
      VITE_USE_EMULATORS: "true",
      VITE_FIREBASE_AUTH_EMULATOR_URL:
        process.env.VITE_FIREBASE_AUTH_EMULATOR_URL || "http://127.0.0.1:9099",
      VITE_FIRESTORE_EMULATOR_HOST:
        process.env.VITE_FIRESTORE_EMULATOR_HOST || "127.0.0.1",
      VITE_FIRESTORE_EMULATOR_PORT:
        process.env.VITE_FIRESTORE_EMULATOR_PORT || "8080",
    },
  },
});
