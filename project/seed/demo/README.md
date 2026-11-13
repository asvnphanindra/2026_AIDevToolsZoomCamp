# Demo seed (fictional)

`fictional.json` is the US-A2 sample. Anonymous **Try demo** copies it into Firestore at:

```text
demo/{uid}                  ← profile doc (mode: demo)
demo/{uid}/areas|tasks|blocks|rules|focusItems|…
demo/{uid}/checkIns/…       ← runtime check-ins
```

All demo load + mutations go through Firestore (`src/lib/demo-store.ts`). There is no offline / localStorage demo path.

Personal Google sign-in data stays under `users/{uid}/…`. Rules: anonymous only own `demo/{uid}`; non-anonymous only own `users/{uid}`.

Local: `npm start` (Auth + Firestore emulators, JDK 21+). Prod: Anonymous Auth enabled on the Firebase project.

Never put personal planner data or real keys here (`seed/personal` is git-ignored).
