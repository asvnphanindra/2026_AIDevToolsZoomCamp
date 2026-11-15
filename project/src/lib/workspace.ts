import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import type { ActorRole } from "@/lib/activity-log";
import { db } from "@/lib/firebase";

export type UserProfileRole = "owner" | "bot" | "human";

export type WorkspaceProfile = {
  uid: string;
  displayName: string;
  role: UserProfileRole;
  /** Human workspace that owns teaching plan + activity (self for owners). */
  workspaceOwnerUid: string;
};

/** Ensure human profile owns its workspace after first signup. */
export async function ensureWorkspaceOwner(
  uid: string,
  displayName: string,
): Promise<WorkspaceProfile> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      displayName,
      timezone: "Asia/Kolkata",
      role: "owner",
      workspaceOwnerUid: uid,
      mode: "owner",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return {
      uid,
      displayName,
      role: "owner",
      workspaceOwnerUid: uid,
    };
  }

  const data = snap.data();
  const role = (data["role"] as UserProfileRole) || "owner";
  let workspaceOwnerUid = String(data["workspaceOwnerUid"] ?? "");
  if (!workspaceOwnerUid) {
    workspaceOwnerUid = role === "bot" ? "" : uid;
    if (workspaceOwnerUid) {
      await updateDoc(ref, {
        workspaceOwnerUid,
        role: role === "bot" ? "bot" : "owner",
        updatedAt: serverTimestamp(),
      });
    }
  }
  return {
    uid,
    displayName: String(data["displayName"] ?? displayName),
    role: role === "bot" ? "bot" : workspaceOwnerUid === uid ? "owner" : role,
    workspaceOwnerUid: workspaceOwnerUid || uid,
  };
}

export async function loadWorkspaceProfile(
  uid: string,
): Promise<WorkspaceProfile | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  const role = (data["role"] as UserProfileRole) || "owner";
  const workspaceOwnerUid = String(data["workspaceOwnerUid"] ?? uid);
  return {
    uid,
    displayName: String(data["displayName"] ?? ""),
    role,
    workspaceOwnerUid: workspaceOwnerUid || uid,
  };
}

/** Allowlist a bot under the human owner: users/{ownerUid}/bots/{botUid}. */
export async function allowlistBot(
  ownerUid: string,
  botUid: string,
  label: string,
): Promise<void> {
  await setDoc(doc(db, "users", ownerUid, "bots", botUid), {
    label,
    role: "bot",
    createdAt: serverTimestamp(),
  });
}

export async function isBotAllowlisted(
  ownerUid: string,
  botUid: string,
): Promise<boolean> {
  const snap = await getDoc(doc(db, "users", ownerUid, "bots", botUid));
  return snap.exists();
}

export function actorRoleFromProfile(profile: WorkspaceProfile): ActorRole {
  if (profile.role === "bot") return "bot";
  if (profile.role === "owner") return "owner";
  return "human";
}
