const CACHE_NAME = "caelum-wave-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// Install: Pre-cache core app assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }),
  );
  self.skipWaiting();
});

// Activate: Clean up old cache versions
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        }),
      );
    }),
  );
  self.clients.claim();
});

// Fetch: Serve from cache when offline (skip stream API endpoints)
self.addEventListener("fetch", (event) => {
  // Let IndexedDB handle audio streams directly
  if (event.request.url.includes("/api/stream")) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        // Fallback to cached home page on offline navigation
        if (event.request.mode === "navigate") {
          return caches.match("/");
        }
      });
    }),
  );
});
