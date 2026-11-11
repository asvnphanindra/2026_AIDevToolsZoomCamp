/**
 * One-shot: anonymous Auth + write full fictional seed; print collection counts.
 * Requires Auth :9099 and Firestore :8080 (npm start).
 */
import { initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  signInAnonymously,
} from "firebase/auth";
import {
  collection,
  connectFirestoreEmulator,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const seed = JSON.parse(
  readFileSync(join(root, "seed/demo/fictional.json"), "utf8"),
);

const DEMO_SUBCOLLECTIONS = [
  "areas",
  "tasks",
  "bands",
  "schedule",
  "dayTypes",
  "scheduleChanges",
  "routines",
  "repeatingTasks",
  "blocks",
  "rules",
  "focusItems",
  "goals",
  "weekHorizon",
  "areaGoals",
  "events",
  "series",
];

const app = initializeApp({
  apiKey: "demo",
  projectId: "work-planner-demo",
  appId: "1:demo",
});
const auth = getAuth(app);
const db = getFirestore(app);
connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
connectFirestoreEmulator(db, "127.0.0.1", 8080);

const { user } = await signInAnonymously(auth);
const uid = user.uid;

function setSub(batch, name, rows) {
  for (const row of rows ?? []) {
    const { id, ...fields } = row;
    batch.set(doc(db, "users", uid, name, id), fields);
  }
}

const batch = writeBatch(db);
batch.set(doc(db, "users", uid), {
  ...seed.profile,
  mode: "demo",
  seededFrom: "seed/demo/fictional.json",
  seededCollections: DEMO_SUBCOLLECTIONS,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});
setSub(batch, "areas", seed.areas);
setSub(batch, "tasks", seed.tasks);
setSub(batch, "bands", seed.bands);
setSub(batch, "schedule", seed.schedule);
setSub(batch, "scheduleChanges", seed.scheduleChanges ?? []);
setSub(batch, "routines", seed.routines);
setSub(batch, "repeatingTasks", seed.repeatingTasks ?? []);
setSub(batch, "blocks", seed.blocks);
setSub(batch, "rules", seed.rules);
setSub(batch, "focusItems", seed.focusItems ?? []);
setSub(batch, "goals", seed.goals ?? []);
setSub(batch, "weekHorizon", seed.weekHorizon ?? []);
setSub(batch, "areaGoals", seed.areaGoals ?? []);
setSub(batch, "events", seed.events ?? []);
setSub(batch, "series", seed.series ?? []);
for (const dayType of seed.dayTypes) {
  batch.set(
    doc(db, "users", uid, "dayTypes", `offset-${dayType.dayOffset}`),
    dayType,
  );
}
batch.set(doc(db, "demo", "seed"), {
  label: "Fictional Work Planner sample",
  areaCount: seed.areas.length,
  taskCount: seed.tasks.length,
  collections: DEMO_SUBCOLLECTIONS,
  updatedAt: serverTimestamp(),
});
await batch.commit();

const counts = {};
for (const name of DEMO_SUBCOLLECTIONS) {
  const snap = await getDocs(collection(db, "users", uid, name));
  counts[name] = snap.size;
}
const demo = await getDoc(doc(db, "demo", "seed"));
console.log(
  JSON.stringify(
    {
      uid,
      counts,
      demoExists: demo.exists(),
      browse: `http://127.0.0.1:4000/firestore/data/users/${uid}`,
    },
    null,
    2,
  ),
);
process.exit(0);
