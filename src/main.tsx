import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";

const rootEl = document.getElementById("root") as HTMLElement;
if (rootEl) rootEl.dataset.appMounted = "";

createRoot(rootEl).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);

// Tandai berhasil mount agar fallback di index.html tidak muncul
queueMicrotask(() => {
  if (rootEl) rootEl.dataset.appMounted = "true";
  (window as any).__clearAppBootTimer?.();
});
