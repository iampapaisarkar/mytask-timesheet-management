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
import { spacing } from "@mytask/theme";
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
  const { data, isLoading, isError, refetch } = useTimesheets();
  const rows = (Array.isArray(data) ? data : []) as TimesheetRow[];
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
            #{String(item.id ?? "")}
            {item.code ? ` · ${item.code}` : ""}
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
});
