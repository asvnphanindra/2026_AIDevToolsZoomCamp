import { randomBytes } from "node:crypto";

/** 32-char hex trace id (W3C-compatible). */
export function newTraceId() {
  return randomBytes(16).toString("hex");
}

/** 16-char hex span id. */
export function newSpanId() {
  return randomBytes(8).toString("hex");
}

export function normalizeTraceId(value) {
  if (typeof value !== "string") return newTraceId();
  const hex = value.replace(/[^0-9a-fA-F]/g, "").toLowerCase();
  if (hex.length === 32) return hex;
  if (hex.length > 0 && hex.length < 32) return hex.padStart(32, "0").slice(-32);
  return newTraceId();
}
