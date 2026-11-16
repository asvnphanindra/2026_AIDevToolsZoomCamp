import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import { connectFirebaseEmulators } from "./lib/firebase";
import "./index.css";

connectFirebaseEmulators();

// Best-effort: never block first paint if SW registration throws.
try {
  registerSW({ immediate: true });
} catch {
  /* PWA optional */
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
