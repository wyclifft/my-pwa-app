const CACHE_NAME = "mckmen-cache-v6"; // bump this every deploy
const urlsToCache = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

// -----------------------------
// Install and Cache Files
// -----------------------------
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// -----------------------------
// Activate and Cleanup Old Cache
// -----------------------------
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// -----------------------------
// Fetch with Cache Fallback
// -----------------------------
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // 👉 Skip Supabase API requests
  if (url.hostname.includes("supabase.co")) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const resClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, resClone);
        });
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// -----------------------------
// Listen for SKIP_WAITING Message
// -----------------------------
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// -----------------------------
// Push Notifications
// -----------------------------
self.addEventListener("push", (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { title: "New Notification", message: event.data.text() };
    }
  }

  const title = data.title || "📢 Update Available";
  const options = {
    body: data.message || "You have a new update",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// -----------------------------
// Handle Notification Click
// -----------------------------
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow("./");
    })
  );
});
