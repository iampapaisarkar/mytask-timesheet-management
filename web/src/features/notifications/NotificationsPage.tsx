import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useNotifications,
} from "@mytask/hooks";
import { DEFAULT_LIST_PAGE_SIZE } from "@mytask/constants";
import { resolveNotificationPath } from "@mytask/services";
import type { AppNotification } from "@mytask/types";
import {
  formatDisplayDateTime,
  formatTimeAgo,
  getErrorMessage,
} from "@mytask/utils";
import { ResourceListPage } from "@/features/shared/ResourceListPage";
import { useOrganisationStore } from "@/store/organisationStore";
import { useToastStore } from "@/store/toastStore";

export function NotificationsPage() {
  const [page, setPage] = useState(1);
  const { orgCode: routeOrg = "" } = useParams();
  const orgCode =
    useOrganisationStore((s) => s.organisation?.code) || routeOrg;
  const navigate = useNavigate();
  const toast = useToastStore();
  const markAs = useMarkNotificationAsRead();
  const markAll = useMarkAllNotificationsAsRead();

  const query = useNotifications({
    rows_per_page: DEFAULT_LIST_PAGE_SIZE,
    page_number: page,
  });

  const unreadCount =
    query.data &&
    typeof query.data === "object" &&
    "unread_count" in query.data
      ? Number((query.data as { unread_count?: number }).unread_count)
      : 0;

  function openNotification(row: Record<string, unknown>) {
    const item = row as AppNotification;
    if (item.status?.code === "unread") {
      markAs.mutate(item.id);
    }
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
    <ResourceListPage
      title="Notifications"
      query={query}
      page={page}
      onPageChange={setPage}
      createLabel={
        unreadCount > 0 && !markAll.isPending ? "Mark all read" : undefined
      }
      onCreate={
        unreadCount > 0
          ? () => {
              markAll.mutate(undefined, {
                onSuccess: () =>
                  toast.success("All caught up", "Notifications marked as read"),
                onError: (err) =>
                  toast.error(
                    "Unable to update",
                    getErrorMessage(err, "Could not mark all as read"),
                  ),
              });
            }
          : undefined
      }
      onRowClick={openNotification}
      columns={[
        {
          key: "title",
          label: "Title",
          accessor: (row) => String(row.title || "Notification"),
        },
        {
          key: "body",
          label: "Message",
          accessor: (row) => String(row.body || "—"),
        },
        {
          key: "status",
          label: "Status",
          accessor: (row) => {
            const status = row.status as { name?: string; code?: string } | null;
            return status?.name || status?.code || "—";
          },
        },
        {
          key: "sent_at",
          label: "When",
          accessor: (row) => {
            const sent = row.sent_at as string | undefined;
            if (!sent) return "—";
            return `${formatTimeAgo(sent)} (${formatDisplayDateTime(sent)})`;
          },
        },
      ]}
    />
  );
}
