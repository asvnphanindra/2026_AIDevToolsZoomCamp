export type AppUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  isAnonymous: boolean;
  /** firebase = Auth emulator/cloud; local-* = offline session */
  backend: "firebase" | "local";
};

const LOCAL_KEY = "work-planner.local-session";

type LocalPayload = {
  uid: string;
  email: string | null;
  displayName: string | null;
  isAnonymous: boolean;
};

export function readLocalSession(): AppUser | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as LocalPayload;
    return { ...data, backend: "local" };
  } catch {
    return null;
  }
}

export function writeLocalSession(user: Omit<AppUser, "backend">): AppUser {
  const session: AppUser = { ...user, backend: "local" };
  localStorage.setItem(
    LOCAL_KEY,
    JSON.stringify({
      uid: session.uid,
      email: session.email,
      displayName: session.displayName,
      isAnonymous: session.isAnonymous,
    }),
  );
  return session;
}

export function clearLocalSession(): void {
  localStorage.removeItem(LOCAL_KEY);
}

export function localDemoUser(): AppUser {
  return writeLocalSession({
    uid: "local-demo-user",
    email: null,
    displayName: "Alex Rivera (demo)",
    isAnonymous: true,
  });
}

export function localOwnerUser(): AppUser {
  return writeLocalSession({
    uid: "local-owner-user",
    email: "owner@example.com",
    displayName: "Planner Owner",
    isAnonymous: false,
  });
}
