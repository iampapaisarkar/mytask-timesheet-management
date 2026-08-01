import { useEffect, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTimesheets } from "@mytask/hooks";
import { DEFAULT_LIST_PAGE_SIZE } from "@mytask/constants";
import { spacing } from "@mytask/theme";
import {
  formatTimesheetLabel,
  listPagination,
  listRows,
} from "@mytask/utils";
import { SearchBar } from "../components/SearchBar";
import { ListPager } from "../components/ListPager";
import { SkeletonList } from "../components/Skeleton";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import type { SheetsStackParamList } from "../navigation/types";
import { useThemeStore } from "../store/themeStore";
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

function statusLabel(status: TimesheetRow["status"]) {
  if (!status) return "—";
  if (typeof status === "string") return status;
  return status.name || status.code || "—";
}

export function TimesheetListScreen({ navigation, route }: Props) {
  const { orgCode } = route.params;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 400);
  const c = useThemeStore((s) => s.colors);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isLoading, isError, isFetching, refetch } = useTimesheets({
    rows_per_page: DEFAULT_LIST_PAGE_SIZE,
    page_number: page,
    sort_by: "id",
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  });
  const rows = listRows<TimesheetRow>(data);
  const pagination = listPagination(data);
  const totalPages = Math.max(1, Number(pagination?.total_pages) || 1);
  const currentPage = Number(pagination?.page_number) || page;

  if (isError && !data) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <Text style={{ color: c.text }}>Failed to load timesheets</Text>
        <TouchableOpacity onPress={() => void refetch()}>
          <Text style={[styles.link, { color: c.primary }]}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={styles.header}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search by timesheet code"
        />
      </View>
      {isLoading && !data ? (
        <SkeletonList rows={6} />
      ) : (
        <FlatList
          contentContainerStyle={{ padding: spacing.md, paddingTop: 0 }}
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
              {debouncedSearch
                ? "No timesheets match that code"
                : "No timesheets found"}
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
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.card,
                { backgroundColor: c.surface, borderColor: c.border },
              ]}
              onPress={() => {
                if (item.id == null) return;
                navigation.navigate("TimesheetDetail", {
                  orgCode,
                  id: String(item.id),
                });
              }}
            >
              <Text style={[styles.id, { color: c.text }]}>
                {formatTimesheetLabel({ code: item.code, id: item.id })}
              </Text>
              <Text style={{ color: c.muted }}>
                {item.period_range || "—"}
                {Array.isArray(item.jobs) && item.jobs.length
                  ? ` · ${item.jobs.map((j) => j.name).filter(Boolean).join(", ")}`
                  : item.job?.name
                    ? ` · ${item.job.name}`
                    : ""}{" "}
                · {statusLabel(item.status)}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  id: { fontWeight: "700", marginBottom: 4 },
  empty: { textAlign: "center", marginTop: 40 },
  link: { fontWeight: "700", marginTop: 8 },
});
