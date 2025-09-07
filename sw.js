self.addEventListener('push', event => {
  const data = event.data.json();
  const title = data.title || "Announcement";
  const options = {
    body: data.message || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    vibrate: [200, 100, 200],
    tag: "announcement",
    renotify: true,
    requireInteraction: true
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/')); // Opens your app
});
