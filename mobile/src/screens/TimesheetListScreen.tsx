import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTimesheets } from "@mysheet/hooks";
import { colors, spacing } from "@mysheet/theme";

export function TimesheetListScreen() {
  const { data, isLoading, isError } = useTimesheets();
  const rows = (Array.isArray(data) ? data : []) as Array<Record<string, unknown>>;

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text>Failed to load timesheets</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={{ padding: spacing.md }}
      data={rows}
      keyExtractor={(item, index) => String(item.id ?? index)}
      ListEmptyComponent={<Text style={styles.empty}>No timesheets found</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.id}>#{String(item.id ?? "")}</Text>
          <Text>{String(item.status ?? "—")}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  id: { fontWeight: "700", marginBottom: 4 },
  empty: { textAlign: "center", color: colors.greyDark, marginTop: 40 },
});
