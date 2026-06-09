"use client";

import { useEffect } from "react";

// Registruje service worker (jen na produkci) — kvůli instalovatelnosti PWA.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
