import { describe, expect, it } from "vitest";
import { alreadyMigrated } from "@/lib/migrate-local";

describe("migrate-local", () => {
  it("treats missing migratedAt as not migrated", () => {
    expect(alreadyMigrated(undefined)).toBe(false);
    expect(alreadyMigrated({})).toBe(false);
    expect(alreadyMigrated({ displayName: "x" })).toBe(false);
  });

  it("is idempotent once migratedAt is set", () => {
    expect(alreadyMigrated({ migratedAt: { seconds: 1 } })).toBe(true);
    expect(alreadyMigrated({ migratedAt: "2026-11-16T00:00:00Z" })).toBe(true);
  });
});
