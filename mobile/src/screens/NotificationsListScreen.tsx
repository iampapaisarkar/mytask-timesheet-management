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
import { getOrganisationAcl, resolveNotificationPath } from "@mytask/services";
import { spacing, typography } from "@mytask/theme";
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
import { navigateNotificationPath } from "../navigation/navigateNotificationPath";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useOrganisationStore } from "../store/organisationStore";
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";
import { triggerHaptic } from "../utils/haptics";
import { BellIcon } from "../ui/icons";
import { Card, EmptyState, ErrorState } from "../ui";

type Props = NativeStackScreenProps<RootStackParamList, "NotificationsList">;

export function NotificationsListScreen({ navigation, route }: Props) {
  const { orgCode } = route.params;
  const organisation = useOrganisationStore((s) => s.organisation);
  const role = organisation?.role || organisation?.role_code;
  const acl = getOrganisationAcl(role);
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

    const path = resolved.path;
    const goesToOrg = /\/org\//.test(path);

    const runNavigate = () =>
      navigateNotificationPath({
        navigation,
        path,
        acl,
        onAccessDenied: (message) => toast.warning("Access denied", message),
        onUnhandled: () =>
          toast.info("Opened", item.title || "Notification"),
      });

    // Leave NotificationsList first so the destination is a normal stack
    // screen, not covered by / presented like the notifications sheet.
    if (goesToOrg && navigation.canGoBack()) {
      navigation.goBack();
      queueMicrotask(() => {
        runNavigate();
      });
      return;
    }

    runNavigate();
  }

  if (isError && !data) {
    return (
      <View style={[styles.flex, { backgroundColor: c.bg }]}>
        <ErrorState
          title="Failed to load notifications"
          description="Check your connection and try again."
          onRetry={() => void refetch()}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {isLoading && !data ? (
        <SkeletonList rows={6} />
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
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
            <EmptyState
              icon={<BellIcon color={c.primary} size={26} />}
              title="No notifications yet"
              description="Updates about your organisation will show up here."
            />
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
              <Card
                style={styles.card}
                accentBorder={unread ? c.primary : undefined}
                onPress={() => openNotification(item)}
                accessibilityLabel={item.title || "Notification"}
              >
                <View style={styles.titleRow}>
                  {unread ? (
                    <View style={[styles.unreadDot, { backgroundColor: c.primary }]} />
                  ) : null}
                  <Text
                    style={[
                      styles.title,
                      { color: c.text, fontWeight: unread ? "700" : "600" },
                    ]}
                    numberOfLines={2}
                  >
                    {item.title || "Notification"}
                  </Text>
                </View>
                {item.body ? (
                  <Text style={[styles.body, { color: c.muted }]} numberOfLines={3}>
                    {item.body}
                  </Text>
                ) : null}
                <View style={styles.metaRow}>
                  <Text style={[styles.meta, { color: c.subtle }]}>
                    {item.status?.name || item.status?.code || "—"}
                  </Text>
                  {item.sent_at ? (
                    <Text
                      style={[styles.meta, { color: c.subtle }]}
                      accessibilityLabel={formatDisplayDateTime(item.sent_at)}
                    >
                      {formatTimeAgo(item.sent_at)}
                    </Text>
                  ) : null}
                </View>
              </Card>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  card: { marginBottom: spacing.sm },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  unreadDot: { width: 7, height: 7, borderRadius: 4 },
  title: { flex: 1, fontSize: typography.sizes.md },
  body: { fontSize: typography.sizes.sm, lineHeight: 18, marginBottom: 8 },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  meta: { fontSize: typography.sizes.xs, fontWeight: "600" },
});
