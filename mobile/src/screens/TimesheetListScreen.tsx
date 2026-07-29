import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTimesheets } from "@mytask/hooks";
import { spacing } from "@mytask/theme";
import { useThemeStore } from "../store/themeStore";

export function TimesheetListScreen() {
  const { data, isLoading, isError } = useTimesheets();
  const rows = (Array.isArray(data) ? data : []) as Array<Record<string, unknown>>;
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
      renderItem={({ item }) => (
        <View
          style={[
            styles.card,
            { backgroundColor: c.surface, borderColor: c.border },
          ]}
        >
          <Text style={[styles.id, { color: c.text }]}>
            #{String(item.id ?? "")}
          </Text>
          <Text style={{ color: c.muted }}>{String(item.status ?? "—")}</Text>
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
});
