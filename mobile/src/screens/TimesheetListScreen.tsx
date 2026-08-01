import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTimesheets } from "@mytask/hooks";
import { DEFAULT_LIST_PAGE_SIZE } from "@mytask/constants";
import { can, getOrganisationAcl } from "@mytask/services";
import { spacing, typography } from "@mytask/theme";
import {
  formatTimesheetLabel,
  listPagination,
  listRows,
} from "@mytask/utils";
import { AccessDenied } from "../components/AccessDenied";
import { SearchBar } from "../components/SearchBar";
import { ListPager } from "../components/ListPager";
import { SkeletonList } from "../components/Skeleton";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import type { SheetsStackParamList } from "../navigation/types";
import { useOrgNavigate } from "../navigation/useOrgNavigate";
import { useOrganisationStore } from "../store/organisationStore";
import { useThemeStore } from "../store/themeStore";
import {
  BriefcaseIcon,
  Card,
  EmptyState,
  ErrorState,
  FilterChips,
  ScreenHeader,
  SheetsIcon,
  StatusBadge,
  statusLabel,
} from "../ui";
import { triggerHaptic } from "../utils/haptics";

type Props = NativeStackScreenProps<SheetsStackParamList, "TimesheetList">;

type TimesheetRow = {
  id?: number | string;
  code?: string;
  period_range?: string;
  status?: { name?: string; code?: string } | string;
  job?: { id?: number; name?: string } | null;
  jobs?: Array<{ id?: number; name?: string }> | null;
};

type StatusFilter = "all" | "approved" | "pending" | "rejected" | "draft";

function statusCode(status: TimesheetRow["status"]) {
  if (!status) return "";
  if (typeof status === "string") return status.toLowerCase();
  return (status.code || status.name || "").toLowerCase();
}

function jobLabel(item: TimesheetRow) {
  if (Array.isArray(item.jobs) && item.jobs.length) {
    return item.jobs
      .map((j) => j.name)
      .filter(Boolean)
      .join(", ");
  }
  return item.job?.name || "";
}

export function TimesheetListScreen({ route }: Props) {
  const { orgCode } = route.params;
  const navigateOrg = useOrgNavigate();
  const organisation = useOrganisationStore((s) => s.organisation);
  const role = organisation?.role || organisation?.role_code;
  const acl = getOrganisationAcl(role);
  const canList = can(acl, "timesheet", "list");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const debouncedSearch = useDebouncedValue(search.trim(), 400);
  const c = useThemeStore((s) => s.colors);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isLoading, isError, isFetching, refetch } = useTimesheets(
    {
      rows_per_page: DEFAULT_LIST_PAGE_SIZE,
      page_number: page,
      sort_by: "id",
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
    },
    canList,
  );
  const rows = listRows<TimesheetRow>(data);
  const pagination = listPagination(data);
  const totalPages = Math.max(1, Number(pagination?.total_pages) || 1);
  const currentPage = Number(pagination?.page_number) || page;

  const filteredRows = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((row) => {
      const code = statusCode(row.status);
      if (filter === "pending") {
        return (
          code.includes("pend") ||
          code.includes("submit") ||
          code === "pending_approval"
        );
      }
      return code.includes(filter);
    });
  }, [rows, filter]);

  if (!canList) {
    return <AccessDenied />;
  }

  if (isError && !data) {
    return (
      <View style={[styles.flex, { backgroundColor: c.bg }]}>
        <ErrorState
          title="Failed to load timesheets"
          description="Check your connection and try again."
          onRetry={() => void refetch()}
        />
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: c.bg }]}>
      <View style={styles.header}>
        <ScreenHeader
          title="Timesheets"
          subtitle="Track periods, jobs, and approval status"
        />
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search by timesheet code"
        />
        <FilterChips
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "approved", label: "Approved" },
            { value: "pending", label: "Pending" },
            { value: "draft", label: "Draft" },
            { value: "rejected", label: "Rejected" },
          ]}
        />
      </View>
      {isLoading && !data ? (
        <SkeletonList rows={6} />
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={filteredRows}
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
              icon={<SheetsIcon color={c.primary} size={28} />}
              title={
                debouncedSearch || filter !== "all"
                  ? "No matching timesheets"
                  : "No timesheets yet"
              }
              description={
                debouncedSearch || filter !== "all"
                  ? "Try a different search or clear filters."
                  : "Your timesheet periods will appear here once created."
              }
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
            const jobs = jobLabel(item);
            return (
              <Card
                style={styles.card}
                accessibilityLabel={`Timesheet ${formatTimesheetLabel({
                  code: item.code,
                  id: item.id,
                })}`}
                onPress={() => {
                  if (item.id == null) return;
                  void triggerHaptic("selection");
                  navigateOrg("TimesheetDetail", {
                    orgCode,
                    id: String(item.id),
                    timesheetCode: formatTimesheetLabel({
                      code: item.code,
                      id: item.id,
                    }),
                  });
                }}
              >
                <View style={styles.cardTop}>
                  <Text style={[styles.id, { color: c.text }]} numberOfLines={1}>
                    {formatTimesheetLabel({ code: item.code, id: item.id })}
                  </Text>
                  <StatusBadge status={item.status} />
                </View>
                <Text style={[styles.period, { color: c.muted }]}>
                  {item.period_range || "—"}
                </Text>
                {jobs ? (
                  <View style={styles.metaRow}>
                    <BriefcaseIcon color={c.subtle} size={14} />
                    <Text
                      style={[styles.meta, { color: c.muted }]}
                      numberOfLines={1}
                    >
                      {jobs}
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.meta, { color: c.subtle }]}>
                    {statusLabel(item.status)}
                  </Text>
                )}
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
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  list: {
    padding: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  card: {
    marginBottom: spacing.sm,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: 6,
  },
  id: {
    flex: 1,
    fontSize: typography.sizes.md,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  period: {
    fontSize: typography.sizes.sm,
    fontWeight: "500",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  meta: {
    flex: 1,
    fontSize: typography.sizes.xs,
    fontWeight: "500",
    marginTop: 8,
  },
});
