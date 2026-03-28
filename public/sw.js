/**
 * DoubtSolver Service Worker
 * Strategy:
 *   - App shell (HTML/CSS/JS) → Cache-first, update in background
 *   - /api/* routes           → Network-only (never cache LLM answers)
 *   - Static assets           → Cache-first
 */

const CACHE_NAME = "doubtsolver-v1";

// App shell files to pre-cache on install
const PRECACHE = [
  "/",
  "/manifest.json",
];

// ── Install: pre-cache shell ──────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// ── Activate: delete old caches ───────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: route requests ─────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never cache API calls or Next.js internal assets (HMR, dev server, build chunks)
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/")) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache-first for everything else (app shell + static assets)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Only cache same-origin successful GET responses
        if (
          response.ok &&
          event.request.method === "GET" &&
          url.origin === self.location.origin
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
