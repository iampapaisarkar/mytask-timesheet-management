import { useLayoutEffect, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useNotifications,
} from "@mytask/hooks";
import { DEFAULT_LIST_PAGE_SIZE } from "@mytask/constants";
import { resolveNotificationPath } from "@mytask/services";
import { spacing } from "@mytask/theme";
import type { AppNotification } from "@mytask/types";
import {
  formatDisplayDateTime,
  formatTimeAgo,
  getErrorMessage,
  listPagination,
  listRows,
} from "@mytask/utils";
import { ListPager } from "../components/ListPager";
import { SkeletonList } from "../components/Skeleton";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";
import { triggerHaptic } from "../utils/haptics";

type Props = NativeStackScreenProps<RootStackParamList, "NotificationsList">;

export function NotificationsListScreen({ navigation, route }: Props) {
  const { orgCode } = route.params;
  const [page, setPage] = useState(1);
  const c = useThemeStore((s) => s.colors);
  const toast = useToastStore();
  const markAs = useMarkNotificationAsRead();
  const markAll = useMarkAllNotificationsAsRead();

  const { data, isLoading, isError, isFetching, refetch } = useNotifications({
    rows_per_page: DEFAULT_LIST_PAGE_SIZE,
    page_number: page,
  });
  const rows = listRows<AppNotification>(data);
  const pagination = listPagination(data);
  const totalPages = Math.max(1, Number(pagination?.total_pages) || 1);
  const currentPage = Number(pagination?.page_number) || page;
  const unreadCount =
    data && typeof data === "object" && "unread_count" in data
      ? Number((data as { unread_count?: number }).unread_count)
      : 0;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        unreadCount > 0 ? (
          <TouchableOpacity
            onPress={() => {
              markAll.mutate(undefined, {
                onSuccess: () =>
                  toast.success("All caught up", "Notifications marked as read"),
                onError: (err) =>
                  toast.error(
                    "Unable to update",
                    getErrorMessage(err, "Could not mark all as read"),
                  ),
              });
            }}
            disabled={markAll.isPending}
            hitSlop={8}
          >
            <Text style={{ color: c.primary, fontWeight: "700", fontSize: 13 }}>
              Mark all
            </Text>
          </TouchableOpacity>
        ) : null,
    });
  }, [navigation, unreadCount, markAll, toast, c.primary]);

  function openNotification(item: AppNotification) {
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
    // Mobile deep paths are web-style; map common org routes to stack screens when possible.
    const path = resolved.path;
    const timesheetMatch = path.match(/\/timesheet\/(\d+)/);
    const managementMatch = path.match(/\/timesheet-management\/(\d+)/);
    if (timesheetMatch) {
      navigation.navigate("Organisation", {
        orgCode,
        screen: "Sheets",
        params: {
          screen: "TimesheetDetail",
          params: { orgCode, id: timesheetMatch[1] },
        },
      });
      return;
    }
    if (managementMatch) {
      navigation.navigate("Organisation", {
        orgCode,
        screen: "Manage",
        params: {
          screen: "TimesheetManagementDetail",
          params: { orgCode, id: managementMatch[1] },
        },
      });
      return;
    }
    toast.info("Opened", item.title || "Notification");
  }

  if (isError && !data) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <Text style={{ color: c.text }}>Failed to load notifications</Text>
        <TouchableOpacity onPress={() => void refetch()}>
          <Text style={[styles.link, { color: c.primary }]}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {isLoading && !data ? (
        <SkeletonList rows={6} />
      ) : (
        <FlatList
          contentContainerStyle={{ padding: spacing.md }}
          data={rows}
          keyExtractor={(item, index) => String(item.id ?? index)}
          showsHorizontalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={() => {
                void triggerHaptic("light");
                void refetch();
              }}
              tintColor={c.primary}
            />
          }
          ListEmptyComponent={
            <Text style={[styles.empty, { color: c.muted }]}>
              No notifications yet
            </Text>
          }
          ListFooterComponent={
            <ListPager
              currentPage={currentPage}
              totalPages={totalPages}
              isFetching={isFetching}
              hasRows={Boolean(rows.length || Number(pagination?.total_rows))}
              onPrev={() => setPage(Math.max(1, currentPage - 1))}
              onNext={() => setPage(Math.min(totalPages, currentPage + 1))}
            />
          }
          renderItem={({ item }) => {
            const unread = item.status?.code === "unread";
            return (
              <TouchableOpacity
                style={[
                  styles.card,
                  {
                    backgroundColor: c.surface,
                    borderColor: unread ? c.primary : c.border,
                  },
                ]}
                onPress={() => openNotification(item)}
              >
                <Text
                  style={[
                    styles.title,
                    { color: c.text, fontWeight: unread ? "700" : "600" },
                  ]}
                >
                  {item.title || "Notification"}
                </Text>
                {item.body ? (
                  <Text style={[styles.body, { color: c.muted }]} numberOfLines={3}>
                    {item.body}
                  </Text>
                ) : null}
                <View style={styles.metaRow}>
                  <Text style={[styles.meta, { color: c.muted }]}>
                    {item.status?.name || item.status?.code || "—"}
                  </Text>
                  {item.sent_at ? (
                    <Text
                      style={[styles.meta, { color: c.muted }]}
                      accessibilityLabel={formatDisplayDateTime(item.sent_at)}
                    >
                      {formatTimeAgo(item.sent_at)}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  link: { fontWeight: "700", marginTop: 8 },
  empty: { textAlign: "center", marginTop: 40 },
  card: {
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  title: { fontSize: 15, marginBottom: 4 },
  body: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  meta: { fontSize: 11, fontWeight: "600" },
});
