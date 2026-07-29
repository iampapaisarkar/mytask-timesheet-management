import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useEmployees } from "@mytask/hooks";
import { spacing } from "@mytask/theme";
import { useThemeStore } from "../store/themeStore";

type EmployeeRow = {
  id?: number | string;
  details?: {
    id?: number;
    full_name?: string;
    email?: string;
    phone_number?: string;
    role?: { name?: string };
  };
};

export function EmployeesListScreen() {
  const { data, isLoading, isError, refetch } = useEmployees({
    rows_per_page: 50,
    sort_by: "id",
  });
  const rows = (Array.isArray(data) ? data : []) as EmployeeRow[];
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
                {details.phone_number}
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
});
