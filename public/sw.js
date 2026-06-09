// Minimální service worker — kvůli instalovatelnosti PWA (Android/Chrome).
// Žádné agresivní cachování (appka je datová, za auth) — jen síťový průchod.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request));
  }
});
