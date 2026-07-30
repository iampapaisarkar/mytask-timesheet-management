/* Firebase Cloud Messaging service worker — background / minimized tabs */
/* eslint-disable no-undef */

importScripts(
  "https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js",
);

let messagingBound = false;

async function readFirebaseConfig() {
  try {
    const cache = await caches.open("mytask-firebase-config");
    const res = await cache.match("/__firebase_config__");
    if (res) return res.json();
  } catch {
    // ignore
  }
  return null;
}

async function writeFirebaseConfig(config) {
  const cache = await caches.open("mytask-firebase-config");
  await cache.put(
    "/__firebase_config__",
    new Response(JSON.stringify(config), {
      headers: { "Content-Type": "application/json" },
    }),
  );
}

async function bindMessaging() {
  if (messagingBound) return true;
  const config = await readFirebaseConfig();
  if (!config?.apiKey || !config?.projectId || !config?.appId) {
    console.warn("[FCM SW] Missing Firebase config — waiting for page bootstrap");
    return false;
  }

  if (!firebase.apps.length) {
    firebase.initializeApp(config);
  }

  const messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    const title =
      payload.notification?.title || payload.data?.title || "myTask";
    const body = payload.notification?.body || payload.data?.body || "";
    const url = payload.data?.url || "/";
    const options = {
      body,
      icon: "/logo.png",
      badge: "/logo.png",
      data: { url, ...(payload.data || {}) },
      tag: payload.data?.id ? `notif-${payload.data.id}` : "mytask-notif",
    };
    // Always show explicitly so foreground/background behaviour is consistent
    return self.registration.showNotification(title, options);
  });

  messagingBound = true;
  console.log("[FCM SW] Background messaging bound");
  return true;
}

self.addEventListener("message", (event) => {
  if (event.data?.type === "SET_FIREBASE_CONFIG" && event.data.config) {
    void writeFirebaseConfig(event.data.config).then(() => bindMessaging());
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(bindMessaging());
});

// Attempt bind on load (works when config was cached from a previous session)
void bindMessaging();

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const rawUrl = event.notification?.data?.url || "/";
  let path = "/";
  try {
    if (/^https?:\/\//i.test(rawUrl)) {
      const u = new URL(rawUrl);
      path = `${u.pathname}${u.search}${u.hash}`;
    } else {
      path = rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`;
    }
  } catch {
    path = "/";
  }

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of allClients) {
        if ("focus" in client) {
          await client.focus();
          client.postMessage({ type: "NOTIFICATION_NAVIGATE", path });
          return;
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(path);
      }
    })(),
  );
});
