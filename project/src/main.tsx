import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { connectFirebaseEmulators } from "./lib/firebase";
import "./index.css";

connectFirebaseEmulators();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
