import { useEffect, useRef, type ReactNode } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { resolveNotificationPath } from "@mytask/services";
import {
  getSocketManager,
  SOCKET_EVENTS,
  type SocketEventEnvelope,
} from "@mytask/realtime";
import { useAuthStore } from "../store/authStore";
import { useOrganisationStore } from "../store/organisationStore";
import { useToastStore } from "../store/toastStore";
import {
  navigateNotificationPath,
} from "../navigation/navigateNotificationPath";
import { navigationRef } from "../navigation/navigationRef";
import {
  registerMobilePush,
  subscribeForegroundMessages,
  subscribeNotificationOpened,
  subscribeTokenRefresh,
  type PushMessagePayload,
} from "../services/pushNotifications";

/**
 * Registers FCM after login and routes notification taps into the app navigator.
 * Foreground: toast. Background / quit: OS tray → open → navigate.
 */
export function PushNotificationsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const token = useAuthStore((s) => s.token);
  const orgCode = useOrganisationStore((s) => s.organisation?.code);
  const toast = useToastStore();
  const recentKey = useRef("");

  function navigateFromPush(payload: PushMessagePayload) {
    if (!navigationRef.isReady()) return;
    const resolved = resolveNotificationPath(
      { url: payload.url, title: payload.title, body: payload.body },
      { defaultOrgCode: orgCode || null },
    );
    navigateNotificationPath({
      navigation: navigationRef as never,
      path: resolved.path,
      onUnhandled: () => {
        toast.info(payload.title, payload.body || undefined);
      },
    });
  }

  function presentForeground(payload: PushMessagePayload) {
    const key = `${payload.id || ""}::${payload.title}::${payload.body}::${payload.url || ""}`;
    if (recentKey.current === key) return;
    recentKey.current = key;
    setTimeout(() => {
      if (recentKey.current === key) recentKey.current = "";
    }, 2500);

    toast.info(payload.title, payload.body || undefined);
  }

  useEffect(() => {
    if (!token) return;
    void registerMobilePush();
    return subscribeTokenRefresh();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    return subscribeForegroundMessages(presentForeground);
  }, [token, toast]);

  useEffect(() => {
    if (!token) return;
    return subscribeNotificationOpened(navigateFromPush);
  }, [token, orgCode, toast]);

  useEffect(() => {
    if (!token) return;
    return getSocketManager().subscribeEvents(
      (envelope: SocketEventEnvelope) => {
        if (envelope.event !== SOCKET_EVENTS.NOTIFICATION_CREATED) return;
        if (AppState.currentState !== "active") return;

        const data = (envelope.data || {}) as {
          id?: number | string;
          title?: string;
          body?: string;
          url?: string | null;
        };

        presentForeground({
          title: data.title || "New notification",
          body: data.body || "",
          url: data.url,
          id: data.id != null ? String(data.id) : null,
        });
      },
    );
  }, [token, orgCode, toast]);

  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === "active" && useAuthStore.getState().token) {
        void registerMobilePush();
      }
    };
    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, []);

  return <>{children}</>;
}
