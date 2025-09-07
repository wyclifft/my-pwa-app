// service-worker.js
// Caches app shell but SKIPS Supabase requests (never cached)

// Auto-bump cache name using timestamp (forces new cache on each deploy)
const CACHE_NAME = "community-app-shell-" + Date.now();

const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/css/style.css",
  "/app.js",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

// Install: cache app shell & activate immediately
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(ASSETS_TO_CACHE).catch(() => {})
    )
  );
});

// Activate: cleanup old caches & claim clients
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.map((n) => (n !== CACHE_NAME ? caches.delete(n) : null)))
    )
  );
  self.clients.claim();
});

// Fetch: skip Supabase API, handle static assets
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never cache Supabase API
  if (url.hostname.includes("supabase.co")) {
    event.respondWith(fetch(event.request).catch(() => new Response(null, { status: 503 })));
    return;
  }

  // Network-first for documents
  if (event.request.mode === "navigate" || event.request.destination === "document") {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return res;
        })
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request).then((res) => {
          if (event.request.url.startsWith(self.location.origin)) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return res;
        })
    )
  );
});

// Push notifications
self.addEventListener("push", (event) => {
  let data = { title: "Notification", message: "You have an update" };
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.message = event.data.text();
    }
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

// Notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) return clientList[0].focus();
      return clients.openWindow("/");
    })
  );
});
