import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const rules = readFileSync(path.join(root, "firestore.rules"), "utf8");

const PROJECT_ID = "work-planner-demo";
const FIRESTORE_HOST = process.env.VITE_FIRESTORE_EMULATOR_HOST || "127.0.0.1";
const FIRESTORE_PORT = Number(process.env.VITE_FIRESTORE_EMULATOR_PORT || 8080);

describe("firestore rules: owner / demo / activityLog", () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        host: FIRESTORE_HOST,
        port: FIRESTORE_PORT,
        rules,
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  it("owner can read and write users/{uid} planner docs", async () => {
    const owner = testEnv.authenticatedContext("owner-1", {
      firebase: { sign_in_provider: "password" },
    });
    const db = owner.firestore();
    await assertSucceeds(
      setDoc(doc(db, "users", "owner-1", "tasks", "t1"), {
        title: "Mine",
        areaId: "a1",
      }),
    );
    await assertSucceeds(getDoc(doc(db, "users", "owner-1", "tasks", "t1")));
  });

  it("another user cannot read or write owner data", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users", "owner-1", "tasks", "t1"), {
        title: "Secret",
      });
    });
    const other = testEnv.authenticatedContext("other-2", {
      firebase: { sign_in_provider: "password" },
    });
    const db = other.firestore();
    await assertFails(getDoc(doc(db, "users", "owner-1", "tasks", "t1")));
    await assertFails(
      setDoc(doc(db, "users", "owner-1", "tasks", "t2"), { title: "Nope" }),
    );
  });

  it("anonymous demo user is isolated to demo/{uid}", async () => {
    const anon = testEnv.authenticatedContext("anon-9", {
      firebase: { sign_in_provider: "anonymous" },
    });
    const db = anon.firestore();
    await assertSucceeds(
      setDoc(doc(db, "demo", "anon-9", "tasks", "d1"), { title: "Demo" }),
    );
    await assertSucceeds(getDoc(doc(db, "demo", "anon-9", "tasks", "d1")));
    await assertFails(
      setDoc(doc(db, "users", "anon-9", "tasks", "x"), { title: "No" }),
    );
    await assertFails(
      setDoc(doc(db, "demo", "other-anon", "tasks", "x"), { title: "No" }),
    );
  });

  it("activityLog is append-only (no update/delete)", async () => {
    const owner = testEnv.authenticatedContext("owner-1", {
      firebase: { sign_in_provider: "password" },
    });
    const db = owner.firestore();
    await assertSucceeds(
      setDoc(doc(db, "users", "owner-1", "activityLog", "e1"), {
        actorUid: "owner-1",
        action: "create",
        summary: "created",
      }),
    );
    await assertFails(
      updateDoc(doc(db, "users", "owner-1", "activityLog", "e1"), {
        summary: "tampered",
      }),
    );
    await assertFails(deleteDoc(doc(db, "users", "owner-1", "activityLog", "e1")));
  });

  it("allowlisted bot can create activityLog but not update it", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const fs = ctx.firestore();
      await setDoc(doc(fs, "users", "owner-1", "bots", "bot-1"), {
        label: "assistant",
        role: "bot",
      });
    });
    const bot = testEnv.authenticatedContext("bot-1", {
      firebase: { sign_in_provider: "password" },
    });
    const db = bot.firestore();
    await assertSucceeds(
      setDoc(doc(db, "users", "owner-1", "activityLog", "bot-e1"), {
        actorUid: "bot-1",
        action: "update",
        summary: "bot wrote",
      }),
    );
    await assertFails(
      updateDoc(doc(db, "users", "owner-1", "activityLog", "bot-e1"), {
        summary: "rewrite",
      }),
    );
    // Bot still cannot write arbitrary personal subcollections outside workspace.
    await assertFails(
      setDoc(doc(db, "users", "owner-1", "tasks", "bot-task"), {
        title: "blocked",
      }),
    );
  });
});
