/* eslint-disable no-undef */
importScripts(
  "https://www.gstatic.com/firebasejs/9.16.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.16.0/firebase-messaging-compat.js",
);

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// Initialize the Firebase app in the service worker by passing in your app's Firebase config object.
// Dev:
const firebaseConfig = {
  apiKey: "AIzaSyB0bwdoKkEF8nJwG5ScyVxfBJEhJEy_ss8",
  authDomain: "mysheet-prod.firebaseapp.com",
  projectId: "mysheet-prod",
  storageBucket: "mysheet-prod.firebasestorage.app",
  messagingSenderId: "460667421634",
  appId: "1:460667421634:web:3ea5845b786aa9f4184c5b",
  measurementId: "G-1XXGEBHL67",
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  console.log("Firebase Web Background Notification:: ", payload);
  // Customize notification here
  if (payload.notification && payload.notification.title) {
    // IF message type notification
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
      body: payload.notification.body,
      icon: payload.notification?.icon,
    };
    self.registration.showNotification(notificationTitle, notificationOptions);

    // Post the payload to the client
    self.clients
      .matchAll({ includeUncontrolled: true, type: "window" })
      .then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: "PUSH_NOTIFICATION",
            payload,
          });
        });
      });
  } else {
    // IF message type data
    // Post the payload to the client
    let data = {};

    if (payload.notification && payload.notification.data) {
      data = payload.notification.data;
    } else if (payload.data) {
      data = payload.data;
    }
    self.clients
      .matchAll({ includeUncontrolled: true, type: "window" })
      .then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: "PUSH_DATA",
            data,
          });
        });
      });
  }
});
