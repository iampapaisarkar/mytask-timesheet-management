import { useEffect, useRef, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { resolveNotificationPath } from "@mytask/services";
import {
  getSocketManager,
  SOCKET_EVENTS,
  type SocketEventEnvelope,
} from "@mytask/realtime";
import { useAuthStore } from "@/store/authStore";
import { useOrganisationStore } from "@/store/organisationStore";
import { useToastStore } from "@/store/toastStore";
import { getFirebaseWebConfig } from "@/lib/firebase";
import {
  isWebPushSupported,
  registerServiceWorker,
  registerWebPush,
  showDesktopNotification,
  subscribeForegroundMessages,
} from "@/lib/webPush";

/**
 * Registers FCM and shows:
 * - in-app toast (focused tab)
 * - OS / laptop desktop notification (always, when permission granted)
 */
export function WebPushProvider({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const orgCode = useOrganisationStore((s) => s.organisation?.code);
  const toast = useToastStore();
  const navigate = useNavigate();
  const recentKey = useRef<string>("");

  function presentNotification(input: {
    title: string;
    body: string;
    url?: string | null;
    id?: string | number | null;
    showToast?: boolean;
  }) {
    const key = `${input.id || ""}::${input.title}::${input.body}::${input.url || ""}`;
    if (recentKey.current === key) return;
    recentKey.current = key;
    window.setTimeout(() => {
      if (recentKey.current === key) recentKey.current = "";
    }, 2500);

    const resolved = resolveNotificationPath(
      { url: input.url, title: input.title, body: input.body },
      { defaultOrgCode: orgCode || null },
    );

    if (input.showToast !== false && document.visibilityState === "visible") {
      toast.push({
        title: input.title,
        description: input.body,
        tone: "info",
        onClick: () => navigate(resolved.path),
      });
    }

    void showDesktopNotification({
      title: input.title,
      body: input.body,
      url: resolved.path,
      id: input.id,
    });
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!(await isWebPushSupported())) return;
      const registration = await registerServiceWorker();
      if (cancelled || !registration) return;
      const config = getFirebaseWebConfig();
      const worker =
        registration.active ||
        registration.waiting ||
        registration.installing;
      worker?.postMessage({ type: "SET_FIREBASE_CONFIG", config });
      navigator.serviceWorker.controller?.postMessage({
        type: "SET_FIREBASE_CONFIG",
        config,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    void registerWebPush();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    return subscribeForegroundMessages((msg) => {
      presentNotification({
        title: msg.title,
        body: msg.body,
        url: msg.url,
        id: msg.data?.id,
      });
    });
  }, [token, orgCode, toast, navigate]);

  useEffect(() => {
    if (!token) return;
    return getSocketManager().subscribeEvents((envelope: SocketEventEnvelope) => {
      if (envelope.event !== SOCKET_EVENTS.NOTIFICATION_CREATED) return;

      const data = (envelope.data || {}) as {
        id?: number | string;
        title?: string;
        body?: string;
        url?: string | null;
      };

      presentNotification({
        title: data.title || "New notification",
        body: data.body || "",
        url: data.url,
        id: data.id,
        // Toast only when tab is visible; desktop notification always
        showToast: document.visibilityState === "visible",
      });
    });
  }, [token, orgCode, toast, navigate]);

  useEffect(() => {
    function onSwMessage(event: MessageEvent) {
      if (event.data?.type !== "NOTIFICATION_NAVIGATE") return;
      const path = String(event.data.path || "/");
      const resolved = resolveNotificationPath(
        { url: path },
        { defaultOrgCode: orgCode || null },
      );
      navigate(resolved.path);
    }
    navigator.serviceWorker?.addEventListener("message", onSwMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener("message", onSwMessage);
    };
  }, [navigate, orgCode]);

  return <>{children}</>;
}
