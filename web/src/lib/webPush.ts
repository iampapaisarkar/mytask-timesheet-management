import {
  getMessaging,
  getToken,
  isSupported,
  deleteToken,
  onMessage,
  type Messaging,
  type Unsubscribe,
} from "firebase/messaging";
import { authApi } from "@mytask/api";
import { STORAGE_KEYS } from "@mytask/constants";
import { getApps, initializeApp } from "firebase/app";
import { getFirebaseWebConfig, isFirebaseConfigured } from "@/lib/firebase";

let messaging: Messaging | null = null;
let foregroundUnsub: Unsubscribe | null = null;
let registering = false;

export type ForegroundMessageHandler = (payload: {
  title: string;
  body: string;
  url?: string | null;
  data?: Record<string, string>;
}) => void;

export function getFirebaseVapidKey(): string {
  return (import.meta.env.VITE_FIREBASE_VAPID_KEY || "").trim();
}

export async function isWebPushSupported(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    return false;
  }
  try {
    return await isSupported();
  } catch {
    return false;
  }
}

function ensureMessaging(): Messaging | null {
  if (!isFirebaseConfigured() || !getFirebaseVapidKey()) return null;
  if (messaging) return messaging;
  const config = getFirebaseWebConfig();
  const app = getApps().length ? getApps()[0]! : initializeApp(config);
  messaging = getMessaging(app);
  return messaging;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js",
      { scope: "/" },
    );
    // Wait until active so getToken / config postMessage succeed
    await navigator.serviceWorker.ready;
    return registration;
  } catch (err) {
    console.warn("FCM service worker registration failed", err);
    return null;
  }
}

async function pushConfigToServiceWorker(
  registration: ServiceWorkerRegistration,
): Promise<void> {
  const config = getFirebaseWebConfig();
  const worker =
    registration.active ||
    registration.waiting ||
    registration.installing;
  worker?.postMessage({ type: "SET_FIREBASE_CONFIG", config });

  // Also tell the controlling SW (may differ right after update)
  navigator.serviceWorker.controller?.postMessage({
    type: "SET_FIREBASE_CONFIG",
    config,
  });
}

/**
 * Request permission, obtain FCM token, persist to backend + localStorage.
 */
export async function registerWebPush(): Promise<string | null> {
  if (registering) return localStorage.getItem(STORAGE_KEYS.fcmToken);
  registering = true;
  try {
    if (!(await isWebPushSupported())) {
      console.warn("[FCM] Web push not supported in this browser");
      return null;
    }
    if (!isFirebaseConfigured() || !getFirebaseVapidKey()) {
      console.warn("[FCM] Missing Firebase config or VITE_FIREBASE_VAPID_KEY");
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("[FCM] Notification permission:", permission);
      return null;
    }

    const registration = await registerServiceWorker();
    if (!registration) return null;

    await pushConfigToServiceWorker(registration);

    const msg = ensureMessaging();
    if (!msg) return null;

    const oldToken = localStorage.getItem(STORAGE_KEYS.fcmToken);
    const token = await getToken(msg, {
      vapidKey: getFirebaseVapidKey(),
      serviceWorkerRegistration: registration,
    });
    if (!token) {
      console.warn("[FCM] getToken returned empty");
      return null;
    }

    // Always upsert so DB stays in sync even if localStorage already had the token
    await authApi.updateFcmToken({
      fcmToken: token,
      oldFcmToken: oldToken && oldToken !== token ? oldToken : undefined,
      platform: "web",
    });
    localStorage.setItem(STORAGE_KEYS.fcmToken, token);
    console.info("[FCM] Token registered");
    return token;
  } catch (err) {
    console.warn("Web push registration failed", err);
    return null;
  } finally {
    registering = false;
  }
}

export async function refreshWebPushToken(): Promise<string | null> {
  return registerWebPush();
}

export function subscribeForegroundMessages(
  handler: ForegroundMessageHandler,
): () => void {
  const msg = ensureMessaging();
  if (!msg) return () => undefined;

  foregroundUnsub?.();
  foregroundUnsub = onMessage(msg, (payload) => {
    const title =
      payload.notification?.title ||
      payload.data?.title ||
      "myTask notification";
    const body =
      payload.notification?.body || payload.data?.body || "";
    const url = payload.data?.url || null;
    handler({
      title,
      body,
      url,
      data: payload.data as Record<string, string> | undefined,
    });
  });

  return () => {
    foregroundUnsub?.();
    foregroundUnsub = null;
  };
}

export async function unregisterWebPush(): Promise<void> {
  foregroundUnsub?.();
  foregroundUnsub = null;

  try {
    const msg = ensureMessaging();
    if (msg) {
      await deleteToken(msg);
    }
  } catch {
    // ignore
  }

  localStorage.removeItem(STORAGE_KEYS.fcmToken);
}

export type DesktopNotificationInput = {
  title: string;
  body?: string;
  url?: string | null;
  id?: string | number | null;
};

/**
 * Show an OS / laptop desktop notification via the service worker.
 * Required for foreground tabs — browsers do not auto-show FCM system
 * notifications while the page is focused.
 */
export async function showDesktopNotification(
  input: DesktopNotificationInput,
): Promise<void> {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  try {
    const registration =
      (await registerServiceWorker()) || (await navigator.serviceWorker.ready);

    const tag = input.id
      ? `notif-${input.id}`
      : `notif-${input.title}`.slice(0, 64);

    await registration.showNotification(input.title || "myTask", {
      body: input.body || "",
      icon: "/logo.png",
      badge: "/logo.png",
      tag,
      data: {
        url: input.url || "/",
        id: input.id != null ? String(input.id) : undefined,
      },
    });
  } catch (err) {
    // Fallback if SW showNotification fails
    try {
      const n = new Notification(input.title || "myTask", {
        body: input.body || "",
        icon: "/logo.png",
        tag: input.id ? `notif-${input.id}` : undefined,
        data: { url: input.url || "/" },
      });
      n.onclick = () => {
        window.focus();
        n.close();
      };
    } catch (fallbackErr) {
      console.warn("[FCM] Desktop notification failed", err || fallbackErr);
    }
  }
}
