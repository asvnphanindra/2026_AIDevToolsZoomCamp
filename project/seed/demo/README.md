# Demo seed (fictional)

`fictional.json` is the US-A2 sample. Anonymous **Try demo** copies it into Firestore at:

```text
demo/{uid}/                 ← profile doc (mode: demo)
demo/{uid}/areas/…
demo/{uid}/tasks/…
… (bands, schedule, rules, goals, …)
```

Personal Google sign-in data stays under `users/{uid}/…`. Rules allow anonymous Auth only on their own `demo/{uid}` tree and block anonymous access to `users/`.

Requires Auth + Firestore (emulators locally via `npm start`, or prod project). There is no offline / localStorage demo seed.

Never put personal planner data or real keys here (`seed/personal` is git-ignored).
