const CACHE_NAME = "caelum-wave-v2";
const ASSETS_TO_CACHE = [
  "/",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// Install: Cache core app assets gracefully
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Safely cache each asset individually so one missing asset doesn't break the installation
      for (const asset of ASSETS_TO_CACHE) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn(`SW: Failed to cache asset ${asset}:`, err);
        }
      }
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
  // Let IndexedDB / media engine handle audio streams directly
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
