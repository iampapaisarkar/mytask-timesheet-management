import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useThemeStore } from "../store/themeStore";

type Props = NativeStackScreenProps<RootStackParamList, "Timesheets">;

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
  const { data, isLoading, isError, isFetching, refetch } = useTimesheets({
    rows_per_page: DEFAULT_LIST_PAGE_SIZE,
    page_number: page,
    sort_by: "id",
  });
  const rows = listRows<TimesheetRow>(data);
  const pagination = listPagination(data);
  const totalPages = Math.max(1, Number(pagination?.total_pages) || 1);
  const currentPage = Number(pagination?.page_number) || page;
  const c = useThemeStore((s) => s.colors);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  if (isError) {
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
    <FlatList
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ padding: spacing.md }}
      data={rows}
      keyExtractor={(item, index) => String(item.id ?? index)}
      ListEmptyComponent={
        <Text style={[styles.empty, { color: c.muted }]}>No timesheets found</Text>
      }
      ListFooterComponent={
        rows.length || Number(pagination?.total_rows) ? (
          <View style={styles.pager}>
            <Text style={{ color: c.muted, marginBottom: spacing.sm }}>
              Page {currentPage} of {totalPages}
            </Text>
            <View style={styles.pagerRow}>
              <TouchableOpacity
                disabled={currentPage <= 1 || isFetching}
                onPress={() => setPage(Math.max(1, currentPage - 1))}
              >
                <Text
                  style={[
                    styles.link,
                    {
                      color: currentPage <= 1 ? c.muted : c.primary,
                      opacity: currentPage <= 1 ? 0.5 : 1,
                    },
                  ]}
                >
                  Previous
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={currentPage >= totalPages || isFetching}
                onPress={() =>
                  setPage(Math.min(totalPages, currentPage + 1))
                }
              >
                <Text
                  style={[
                    styles.link,
                    {
                      color:
                        currentPage >= totalPages ? c.muted : c.primary,
                      opacity: currentPage >= totalPages ? 0.5 : 1,
                    },
                  ]}
                >
                  Next
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null
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
  );
}

const styles = StyleSheet.create({
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
  pager: { alignItems: "center", paddingVertical: spacing.md },
  pagerRow: {
    flexDirection: "row",
    gap: 24,
    justifyContent: "center",
  },
});
