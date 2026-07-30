import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "@mytask/api";
import { resolveNotificationPath } from "@mytask/services";
import { getErrorMessage } from "@mytask/utils";
import { useSocketStore } from "@mytask/realtime";
import type { AppNotification } from "@mytask/types";
import { useOrganisationStore } from "@/store/organisationStore";
import { useToastStore } from "@/store/toastStore";
import { Bell } from "lucide-react";
import { clsx } from "clsx";

type NotificationsListResponse = {
  data?: AppNotification[];
  unread_count?: number;
};

function asNotifications(payload: unknown): AppNotification[] {
  if (Array.isArray(payload)) return payload as AppNotification[];
  if (payload && typeof payload === "object" && "data" in payload) {
    const data = (payload as NotificationsListResponse).data;
    return Array.isArray(data) ? data : [];
  }
  return [];
}

function unreadCountFrom(payload: unknown, items: AppNotification[]): number {
  if (payload && typeof payload === "object" && "unread_count" in payload) {
    const n = Number((payload as NotificationsListResponse).unread_count);
    if (!Number.isNaN(n)) return n;
  }
  return items.filter((n) => n.status?.code === "unread").length;
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [pageVisible, setPageVisible] = useState(
    () => typeof document === "undefined" || document.visibilityState === "visible",
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const toast = useToastStore();
  const navigate = useNavigate();
  const orgCode = useOrganisationStore((s) => s.organisation?.code);
  const socketStatus = useSocketStore((s) => s.status);
  const socketLive = socketStatus === "connected";

  useEffect(() => {
    function onVisibility() {
      setPageVisible(document.visibilityState === "visible");
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const listQuery = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: async ({ signal }) => {
      const res = await notificationsApi.list(
        {
          rows_per_page: 20,
          page_number: 1,
        },
        { signal },
      );
      return res.data as NotificationsListResponse;
    },
    // Realtime via Socket.IO when connected; light poll as fallback
    staleTime: 30_000,
    refetchInterval: socketLive
      ? false
      : pageVisible
        ? open
          ? 30_000
          : 60_000
        : false,
    refetchIntervalInBackground: false,
  });

  const items = asNotifications(listQuery.data);
  const unreadCount = unreadCountFrom(listQuery.data, items);

  const markAsMutation = useMutation({
    mutationFn: (id: string | number) => notificationsApi.markAs(id, "read"),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (err) => {
      toast.error(
        "Unable to update",
        getErrorMessage(err, "Could not mark notification as read"),
      );
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAs("read"),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("All caught up", "Notifications marked as read");
    },
    onError: (err) => {
      toast.error(
        "Unable to update",
        getErrorMessage(err, "Could not mark all as read"),
      );
    },
  });

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function onItemClick(item: AppNotification) {
    if (item.status?.code === "unread") {
      markAsMutation.mutate(item.id);
    }
    setOpen(false);
    const resolved = resolveNotificationPath(
      {
        url: item.url,
        title: item.title,
        body: item.body,
      },
      { defaultOrgCode: orgCode || null },
    );
    if (resolved.fallback && !item.url) {
      toast.info(
        "No link available",
        "This notification does not include a destination.",
      );
      return;
    }
    navigate(resolved.path);
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-focus relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-[var(--mt-surface)] text-[var(--mt-text)] hover:border-primary"
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Bell size={16} />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-2xl border border-border bg-[var(--mt-surface)] shadow-lg">
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
            <span className="text-sm font-semibold text-[var(--mt-text)]">
              Notifications
            </span>
            <button
              type="button"
              disabled={unreadCount === 0 || markAllMutation.isPending}
              onClick={() => markAllMutation.mutate()}
              className="text-xs font-semibold text-primary disabled:opacity-40"
            >
              Mark all read
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {listQuery.isLoading ? (
              <p className="px-3 py-6 text-center text-sm text-muted">
                Loading…
              </p>
            ) : listQuery.isError ? (
              <p className="px-3 py-6 text-center text-sm text-negative">
                {getErrorMessage(
                  listQuery.error,
                  "Unable to load notifications",
                )}
              </p>
            ) : items.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted">
                No notifications yet
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((item) => {
                  const unread = item.status?.code === "unread";
                  return (
                    <li key={String(item.id)}>
                      <button
                        type="button"
                        onClick={() => onItemClick(item)}
                        className={clsx(
                          "flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition hover:bg-primary-muted/50",
                          unread && "bg-primary-muted/30",
                        )}
                      >
                        <span
                          className={clsx(
                            "text-sm text-[var(--mt-text)]",
                            unread ? "font-semibold" : "font-medium",
                          )}
                        >
                          {item.title || "Notification"}
                        </span>
                        {item.body ? (
                          <span className="line-clamp-2 text-xs text-muted">
                            {item.body}
                          </span>
                        ) : null}
                        {item.sent_at ? (
                          <span className="text-[10px] text-muted">
                            {new Date(item.sent_at).toLocaleString()}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
