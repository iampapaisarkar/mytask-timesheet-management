import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "@mytask/api";
import { ROUTES } from "@mytask/constants";
import { queryKeys } from "@mytask/hooks";
import { resolveNotificationPath } from "@mytask/services";
import {
  formatDisplayDateTime,
  formatTimeAgo,
  getErrorMessage,
} from "@mytask/utils";
import { useSocketStore } from "@mytask/realtime";
import type { AppNotification } from "@mytask/types";
import { FullScreenModal } from "@/components/ui/FullScreenModal";
import { useOrganisationStore } from "@/store/organisationStore";
import { useToastStore } from "@/store/toastStore";
import { Bell } from "lucide-react";
import { clsx } from "clsx";

type NotificationsListResponse = {
  data?: AppNotification[];
  unread_count?: number;
};

const PREVIEW_LIMIT = 10;

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

function useIsMobileViewport() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 767px)").matches
      : false,
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}

function NotificationItems({
  items,
  loading,
  error,
  onItemClick,
}: {
  items: AppNotification[];
  loading: boolean;
  error: string | null;
  onItemClick: (item: AppNotification) => void;
}) {
  if (loading) {
    return (
      <p className="px-3 py-6 text-center text-sm text-muted">Loading…</p>
    );
  }
  if (error) {
    return (
      <p className="px-3 py-6 text-center text-sm text-negative">{error}</p>
    );
  }
  if (items.length === 0) {
    return (
      <p className="px-3 py-6 text-center text-sm text-muted">
        No notifications yet
      </p>
    );
  }
  return (
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
                <span
                  className="text-[10px] text-muted"
                  title={formatDisplayDateTime(item.sent_at)}
                >
                  {formatTimeAgo(item.sent_at)}
                </span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function PanelChrome({
  unreadCount,
  markAllPending,
  onMarkAll,
  onSeeMore,
  children,
  showSeeMore,
}: {
  unreadCount: number;
  markAllPending: boolean;
  onMarkAll: () => void;
  onSeeMore: () => void;
  children: ReactNode;
  showSeeMore: boolean;
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
        <span className="text-sm font-semibold text-[var(--mt-text)]">
          Notifications
        </span>
        <button
          type="button"
          disabled={unreadCount === 0 || markAllPending}
          onClick={onMarkAll}
          className="text-xs font-semibold text-primary disabled:opacity-40"
        >
          Mark all read
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      {showSeeMore ? (
        <div className="border-t border-border px-3 py-2.5">
          <button
            type="button"
            onClick={onSeeMore}
            className="w-full rounded-xl py-2 text-center text-sm font-semibold text-primary hover:bg-primary-muted/50"
          >
            See more
          </button>
        </div>
      ) : null}
    </>
  );
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [pageVisible, setPageVisible] = useState(
    () =>
      typeof document === "undefined" || document.visibilityState === "visible",
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const toast = useToastStore();
  const navigate = useNavigate();
  const orgCode = useOrganisationStore((s) => s.organisation?.code);
  const socketStatus = useSocketStore((s) => s.status);
  const socketLive = socketStatus === "connected";
  const isMobile = useIsMobileViewport();

  useEffect(() => {
    function onVisibility() {
      setPageVisible(document.visibilityState === "visible");
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const listQuery = useQuery({
    queryKey: queryKeys.notificationsPreview,
    queryFn: async ({ signal }) => {
      const res = await notificationsApi.list(
        {
          rows_per_page: PREVIEW_LIMIT,
          page_number: 1,
        },
        { signal },
      );
      return res.data as NotificationsListResponse;
    },
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

  const items = asNotifications(listQuery.data).slice(0, PREVIEW_LIMIT);
  const unreadCount = unreadCountFrom(listQuery.data, items);

  const markAsMutation = useMutation({
    mutationFn: (id: string | number) => notificationsApi.markAs(id, "read"),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.notifications });
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
      void qc.invalidateQueries({ queryKey: queryKeys.notifications });
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
    if (isMobile) return;
    function onDocClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [isMobile]);

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

  function onSeeMore() {
    setOpen(false);
    if (!orgCode) {
      toast.info("Select an organisation", "Open an organisation to view all notifications.");
      return;
    }
    navigate(ROUTES.notifications(orgCode));
  }

  const panelBody = (
    <PanelChrome
      unreadCount={unreadCount}
      markAllPending={markAllMutation.isPending}
      onMarkAll={() => markAllMutation.mutate()}
      onSeeMore={onSeeMore}
      showSeeMore
    >
      <NotificationItems
        items={items}
        loading={listQuery.isLoading}
        error={
          listQuery.isError
            ? getErrorMessage(listQuery.error, "Unable to load notifications")
            : null
        }
        onItemClick={onItemClick}
      />
    </PanelChrome>
  );

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-focus relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-[var(--mt-surface)] text-[var(--mt-text)] hover:border-primary"
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

      {open && !isMobile ? (
        <div className="absolute right-0 z-40 mt-2 flex max-h-[min(28rem,70vh)] w-[min(100vw-2rem,22rem)] flex-col overflow-hidden rounded-2xl border border-border bg-[var(--mt-surface)] shadow-lg">
          {panelBody}
        </div>
      ) : null}

      {isMobile ? (
        <FullScreenModal
          open={open}
          onClose={() => setOpen(false)}
          title="Notifications"
          variant="workspace"
          closeOnBackdrop
          footer={
            <div className="flex w-full flex-col gap-2 border-t border-border px-4 py-3">
              <button
                type="button"
                disabled={unreadCount === 0 || markAllMutation.isPending}
                onClick={() => markAllMutation.mutate()}
                className="w-full rounded-xl border border-border py-2.5 text-sm font-semibold text-[var(--mt-text)] disabled:opacity-40"
              >
                Mark all read
              </button>
              <button
                type="button"
                onClick={onSeeMore}
                className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white"
              >
                See more
              </button>
            </div>
          }
        >
          <div className="h-full overflow-y-auto bg-[var(--mt-surface)]">
            <NotificationItems
              items={items}
              loading={listQuery.isLoading}
              error={
                listQuery.isError
                  ? getErrorMessage(
                      listQuery.error,
                      "Unable to load notifications",
                    )
                  : null
              }
              onItemClick={onItemClick}
            />
          </div>
        </FullScreenModal>
      ) : null}
    </div>
  );
}
