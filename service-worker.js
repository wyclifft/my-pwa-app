// service-worker.js
// Caches app shell but explicitly SKIPS supabase requests to avoid caching API calls
const CACHE_NAME = "community-app-shell-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/css/style.css",
  "/app.js",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

// Install: cache app shell
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE).catch(() => {}))
  );
});

// Activate: cleanup old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(names => Promise.all(
      names.map(n => (n !== CACHE_NAME ? caches.delete(n) : Promise.resolve()))
    ))
  );
  self.clients.claim();
});

// Fetch: handle caching for app shell, but NEVER cache requests to supabase.co
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip anything to do with Supabase API (do not cache or intercept)
  if (url.hostname.includes("supabase.co")) {
    // Always do a direct network request for Supabase calls (so they get fresh data)
    event.respondWith(fetch(event.request).catch(() => new Response(null, { status: 503 })));
    return;
  }

  // For navigation or app shell: network-first, fallback to cache
  if (event.request.mode === "navigate" || event.request.destination === "document") {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return res;
        })
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  // For other assets: cache-first
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(res => {
      // stash in cache for next time (only for same-origin static assets)
      if (event.request.url.startsWith(self.location.origin)) {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      }
      return res;
    }).catch(() => cached))
  );
});

// Listen for push events (if you later integrate push subscription/notifications)
self.addEventListener("push", (event) => {
  let data = { title: "Notification", message: "You have an update" };
  if (event.data) {
    try { data = event.data.json(); } catch { data.message = event.data.text(); }
  }
  const title = data.title || "Notification";
  const options = {
    body: data.message || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: "announcement"
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(clientList => {
      if (clientList.length > 0) return clientList[0].focus();
      return clients.openWindow("/");
    })
  );
});
