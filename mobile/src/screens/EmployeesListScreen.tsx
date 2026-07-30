import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useEmployees } from "@mytask/hooks";
import { DEFAULT_LIST_PAGE_SIZE } from "@mytask/constants";
import { spacing } from "@mytask/theme";
import { formatPhoneDisplay, listPagination, listRows } from "@mytask/utils";
import { useThemeStore } from "../store/themeStore";

type EmployeeRow = {
  id?: number | string;
  details?: {
    id?: number;
    full_name?: string;
    email?: string;
    phone_number?: string;
    phone_country_iso?: string;
    role?: { name?: string };
  };
};

export function EmployeesListScreen() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, isFetching, refetch } = useEmployees({
    rows_per_page: DEFAULT_LIST_PAGE_SIZE,
    page_number: page,
    sort_by: "id",
  });
  const rows = listRows<EmployeeRow>(data);
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
        <Text style={{ color: c.text }}>Failed to load employees</Text>
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
      keyExtractor={(item, index) =>
        String(item.details?.id ?? item.id ?? index)
      }
      ListEmptyComponent={
        <Text style={[styles.empty, { color: c.muted }]}>No employees</Text>
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
      renderItem={({ item }) => {
        const details = item.details;
        return (
          <View
            style={[
              styles.card,
              { backgroundColor: c.surface, borderColor: c.border },
            ]}
          >
            <Text style={[styles.name, { color: c.text }]}>
              {details?.full_name || `Employee #${details?.id ?? item.id}`}
            </Text>
            <Text style={{ color: c.muted }}>
              {details?.email || "—"}
              {details?.role?.name ? ` · ${details.role.name}` : ""}
            </Text>
            {details?.phone_number ? (
              <Text style={[styles.phone, { color: c.muted }]}>
                {formatPhoneDisplay(
                  details.phone_number,
                  details.phone_country_iso,
                )}
              </Text>
            ) : null}
          </View>
        );
      }}
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
  name: { fontWeight: "700", marginBottom: 4 },
  phone: { marginTop: 4, fontSize: 12 },
  empty: { textAlign: "center", marginTop: 40 },
  link: { fontWeight: "700", marginTop: 8 },
  pager: { alignItems: "center", paddingVertical: spacing.md },
  pagerRow: {
    flexDirection: "row",
    gap: 24,
    justifyContent: "center",
  },
});
