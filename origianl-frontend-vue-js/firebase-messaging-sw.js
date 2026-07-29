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
  apiKey: "AIzaSyBO87hSqrp0eF9dj5WP0282L0EBvQ7X5S8",
  authDomain: "mysheet---dev.firebaseapp.com",
  projectId: "mysheet---dev",
  storageBucket: "mysheet---dev.firebasestorage.app",
  messagingSenderId: "121134355067",
  appId: "1:121134355067:web:2fd7459c49f00d97fe08de",
  measurementId: "G-KCE6V0S3F5",
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
