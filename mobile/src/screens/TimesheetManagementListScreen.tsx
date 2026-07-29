import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTimesheetManagement } from "@mytask/hooks";
import { spacing } from "@mytask/theme";
import { useThemeStore } from "../store/themeStore";

type ManagementRow = {
  id?: number | string;
  period_range?: string;
  code?: string;
  status?: { name?: string; code?: string } | string;
  employee?: { user?: { full_name?: string } };
};

function statusLabel(status: ManagementRow["status"]) {
  if (!status) return "—";
  if (typeof status === "string") return status;
  return status.name || status.code || "—";
}

export function TimesheetManagementListScreen() {
  const { data, isLoading, isError, refetch } = useTimesheetManagement({
    rows_per_page: 50,
    sort_by: "id",
  });
  const rows = (Array.isArray(data) ? data : []) as ManagementRow[];
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
        <Text style={[styles.empty, { color: c.muted }]}>
          No managed timesheets
        </Text>
      }
      renderItem={({ item }) => (
        <View
          style={[
            styles.card,
            { backgroundColor: c.surface, borderColor: c.border },
          ]}
        >
          <Text style={[styles.id, { color: c.text }]}>
            #{String(item.id ?? "")}
            {item.employee?.user?.full_name
              ? ` · ${item.employee.user.full_name}`
              : ""}
          </Text>
          <Text style={{ color: c.muted }}>
            {item.period_range || item.code || "—"} · {statusLabel(item.status)}
          </Text>
        </View>
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
});
