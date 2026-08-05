import AsyncStorage from "@react-native-async-storage/async-storage";
import { PermissionsAndroid, Platform } from "react-native";
// Ensure native default app is registered before Messaging TurboModule use.
import "@react-native-firebase/app";
import {
  AuthorizationStatus,
  deleteToken,
  getInitialNotification,
  getMessaging,
  getToken,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  registerDeviceForRemoteMessages,
  requestPermission,
  setBackgroundMessageHandler,
  type RemoteMessage,
} from "@react-native-firebase/messaging";
import { authApi } from "@mytask/api";
import { STORAGE_KEYS } from "@mytask/constants";

export const ANDROID_NOTIFICATION_CHANNEL_ID = "mytask_default";

let registering = false;
let tokenRefreshUnsub: (() => void) | null = null;

export type PushMessagePayload = {
  title: string;
  body: string;
  url?: string | null;
  id?: string | null;
  data?: Record<string, string>;
};

function platformLabel(): "android" | "ios" {
  return Platform.OS === "ios" ? "ios" : "android";
}

function messagingInstance() {
  return getMessaging();
}

function extractPayload(remoteMessage: RemoteMessage): PushMessagePayload {
  const data = (remoteMessage.data || {}) as Record<string, string>;
  return {
    title:
      remoteMessage.notification?.title ||
      data.title ||
      "myTask notification",
    body: remoteMessage.notification?.body || data.body || "",
    url: data.url || null,
    id: data.id || null,
    data,
  };
}

async function requestAndroidPostNotifications(): Promise<boolean> {
  if (Platform.OS !== "android" || Platform.Version < 33) return true;
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

/**
 * Request OS permission for push notifications.
 */
export async function requestPushPermission(): Promise<boolean> {
  if (Platform.OS === "android") {
    const granted = await requestAndroidPostNotifications();
    if (!granted) return false;
  }

  const authStatus = await requestPermission(messagingInstance());
  return (
    authStatus === AuthorizationStatus.AUTHORIZED ||
    authStatus === AuthorizationStatus.PROVISIONAL
  );
}

async function persistToken(token: string): Promise<void> {
  const oldToken = await AsyncStorage.getItem(STORAGE_KEYS.fcmToken);
  await authApi.updateFcmToken({
    fcmToken: token,
    oldFcmToken: oldToken && oldToken !== token ? oldToken : undefined,
    platform: platformLabel(),
  });
  await AsyncStorage.setItem(STORAGE_KEYS.fcmToken, token);
}

/**
 * Request permission, fetch FCM token, and upsert it on the backend.
 */
export async function registerMobilePush(): Promise<string | null> {
  if (registering) {
    return AsyncStorage.getItem(STORAGE_KEYS.fcmToken);
  }
  registering = true;
  try {
    const allowed = await requestPushPermission();
    if (!allowed) {
      if (__DEV__) console.warn("[FCM] Notification permission not granted");
      return null;
    }

    const messaging = messagingInstance();
    // Android 13+ / some devices need this before getToken returns a usable value
    await registerDeviceForRemoteMessages(messaging);

    const token = await getToken(messaging);
    if (!token) {
      if (__DEV__) console.warn("[FCM] getToken returned empty");
      return null;
    }

    await persistToken(token);
    if (__DEV__) console.info("[FCM] Token registered", platformLabel());
    return token;
  } catch (err) {
    console.warn("[FCM] Registration failed", err);
    return null;
  } finally {
    registering = false;
  }
}

export function subscribeTokenRefresh(): () => void {
  tokenRefreshUnsub?.();
  tokenRefreshUnsub = onTokenRefresh(messagingInstance(), (token) => {
    void persistToken(token).catch((err) => {
      console.warn("[FCM] Token refresh upsert failed", err);
    });
  });
  return () => {
    tokenRefreshUnsub?.();
    tokenRefreshUnsub = null;
  };
}

export function subscribeForegroundMessages(
  handler: (payload: PushMessagePayload) => void,
): () => void {
  return onMessage(messagingInstance(), async (remoteMessage) => {
    handler(extractPayload(remoteMessage));
  });
}

export function subscribeNotificationOpened(
  handler: (payload: PushMessagePayload) => void,
): () => void {
  const messaging = messagingInstance();
  const unsub = onNotificationOpenedApp(messaging, (remoteMessage) => {
    handler(extractPayload(remoteMessage));
  });

  void getInitialNotification(messaging)
    .then((remoteMessage) => {
      if (remoteMessage) handler(extractPayload(remoteMessage));
    })
    .catch(() => undefined);

  return unsub;
}

/**
 * Best-effort cleanup of the local FCM registration (keeps backend row until
 * the next login upsert / stale prune).
 */
export async function unregisterMobilePush(): Promise<void> {
  try {
    await deleteToken(messagingInstance());
  } catch {
    // ignore
  }
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.fcmToken);
  } catch {
    // ignore
  }
}

/** No-op handler so data-only messages don't crash the headless JS runtime. */
export function registerBackgroundMessageHandler(): void {
  setBackgroundMessageHandler(messagingInstance(), async (_remoteMessage) => {
    // Notification+data messages are displayed by the OS while backgrounded.
    // Data-only payloads intentionally do nothing here (in-app list + socket cover UX).
  });
}
