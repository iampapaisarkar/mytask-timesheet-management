import { useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  useSystemLogsEmail,
  useSystemLogsExternal,
  useSystemLogsInternal,
} from "@mytask/hooks";
import { DEFAULT_LIST_PAGE_SIZE } from "@mytask/constants";
import { can, getOrganisationAcl } from "@mytask/services";
import { spacing } from "@mytask/theme";
import { formatDisplayDateTime } from "@mytask/utils";
import { AccessDenied } from "../components/AccessDenied";
import { ListPager } from "../components/ListPager";
import { SkeletonList } from "../components/Skeleton";
import type { OrgStackParamList } from "../navigation/types";
import { useOrganisationStore } from "../store/organisationStore";
import { useThemeStore } from "../store/themeStore";
import { triggerHaptic } from "../utils/haptics";
import { Card, EmptyState, LogIcon, SegmentedControl, StatusBadge } from "../ui";

type Props = NativeStackScreenProps<OrgStackParamList, "SystemLogs">;
type LogKind = "internal" | "external" | "email";

type LogRow = {
  id?: number | string;
  action?: string;
  event?: string;
  subject?: string;
  message?: string;
  status?: string | { name?: string; code?: string };
  created_at?: string;
  actor?: { email?: string; full_name?: string };
};

export function SystemLogsScreen({}: Props) {
  const organisation = useOrganisationStore((s) => s.organisation);
  const role = organisation?.role || organisation?.role_code;
  const acl = getOrganisationAcl(role);
  const canList = can(acl, "systemLog", "list");
  const c = useThemeStore((s) => s.colors);
  const [kind, setKind] = useState<LogKind>("internal");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [kind]);

  const listParams = {
    rows_per_page: DEFAULT_LIST_PAGE_SIZE,
    page_number: page,
    sort_by: "id",
  };

  const internalQuery = useSystemLogsInternal(listParams, canList && kind === "internal");
  const externalQuery = useSystemLogsExternal(listParams, canList && kind === "external");
  const emailQuery = useSystemLogsEmail(listParams, canList && kind === "email");

  const query =
    kind === "internal"
      ? internalQuery
      : kind === "external"
        ? externalQuery
        : emailQuery;

  const rows = (query.data?.rows ?? []) as LogRow[];
  const pagination = query.data?.pagination ?? null;
  const totalPages = Math.max(1, Number(pagination?.total_pages) || 1);
  const currentPage = Number(pagination?.page_number) || page;

  if (!canList) {
    return <AccessDenied />;
  }

  if (query.isLoading && !query.data) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <View style={{ padding: spacing.md, paddingBottom: spacing.sm }}>
          <SegmentedControl
            value={kind}
            onChange={setKind}
            options={[
              { value: "internal", label: "Internal" },
              { value: "external", label: "External" },
              { value: "email", label: "Email" },
            ]}
          />
        </View>
        <SkeletonList rows={6} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ padding: spacing.md, paddingBottom: spacing.sm }}>
        <SegmentedControl
          value={kind}
          onChange={setKind}
          options={[
            { value: "internal", label: "Internal" },
            { value: "external", label: "External" },
            { value: "email", label: "Email" },
          ]}
        />
      </View>
      <FlatList
        data={rows}
        keyExtractor={(item, index) => String(item.id ?? index)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.md, paddingTop: 0 }}
        refreshControl={
          <RefreshControl
            refreshing={query.isFetching && !query.isLoading}
            onRefresh={() => {
              void triggerHaptic("light");
              void query.refetch();
            }}
            tintColor={c.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon={<LogIcon color={c.primary} size={28} />}
            title="No logs"
            description="Activity for this category will show up here."
          />
        }
        ListFooterComponent={
          <ListPager
            currentPage={currentPage}
            totalPages={totalPages}
            isFetching={query.isFetching}
            hasRows={Boolean(rows.length || Number(pagination?.total_rows))}
            onPrev={() => setPage(Math.max(1, currentPage - 1))}
            onNext={() => setPage(Math.min(totalPages, currentPage + 1))}
          />
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.cardTop}>
              <Text
                style={[styles.title, { color: c.text }]}
                numberOfLines={2}
              >
                {item.action || item.event || item.subject || `Log #${item.id}`}
              </Text>
              {item.status ? <StatusBadge status={item.status} /> : null}
            </View>
            {item.message ? (
              <Text style={{ color: c.muted, marginTop: 4 }} numberOfLines={3}>
                {item.message}
              </Text>
            ) : null}
            <Text style={{ color: c.muted, marginTop: 8, fontSize: 12 }}>
              {item.created_at ? formatDisplayDateTime(item.created_at) : ""}
              {item.actor?.full_name || item.actor?.email
                ? ` · ${item.actor.full_name || item.actor.email}`
                : ""}
            </Text>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.sm },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  title: { flex: 1, fontSize: 15, fontWeight: "700" },
});
