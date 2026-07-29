import { useQuery } from "@tanstack/react-query";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { timesheetsApi } from "@mytask/api";
import { spacing } from "@mytask/theme";
import {
  TrackingMap,
  type TrackingLogs,
} from "../components/TrackingMap";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useThemeStore } from "../store/themeStore";

type Props = NativeStackScreenProps<RootStackParamList, "TimesheetDayDetail">;

type DayTask = {
  id?: number;
  is_break?: boolean;
  is_travel?: boolean;
  start_time?: string;
  end_time?: string;
  remarks?: string | null;
  job?: { id?: number; name?: string } | null;
};

type DayPayload = {
  id?: number;
  date?: string;
  day_name?: string;
  is_public_holiday?: boolean;
  remarks?: string | null;
  tasks?: DayTask[];
  tracking_logs?: TrackingLogs;
  status?: { code?: string; name?: string };
};

function taskLabel(task: DayTask) {
  if (task.is_break) return "Break";
  if (task.is_travel) return "Travel";
  return task.job?.name || "Working";
}

export function TimesheetDayDetailScreen({ route }: Props) {
  const { dayId } = route.params;
  const c = useThemeStore((s) => s.colors);

  const query = useQuery({
    queryKey: ["timesheet-day", dayId] as const,
    queryFn: async () => {
      const res = await timesheetsApi.getDay(dayId);
      return (res.data as { data: DayPayload }).data;
    },
  });

  if (query.isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  if (query.isError || !query.data) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <Text style={{ color: c.text }}>Failed to load day</Text>
        <TouchableOpacity onPress={() => void query.refetch()}>
          <Text style={[styles.link, { color: c.primary }]}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const day = query.data;
  const tasks = Array.isArray(day.tasks) ? day.tasks : [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={styles.container}
    >
      <Text style={[styles.title, { color: c.text }]}>
        {day.date || `Day #${dayId}`}
        {day.day_name ? ` · ${day.day_name}` : ""}
      </Text>
      <Text style={[styles.meta, { color: c.muted }]}>
        {day.status?.name || day.status?.code || "—"}
        {day.is_public_holiday ? " · Public holiday" : ""}
      </Text>

      <Text style={[styles.section, { color: c.text }]}>Tasks</Text>
      {!tasks.length ? (
        <Text style={[styles.empty, { color: c.muted }]}>No tasks</Text>
      ) : (
        tasks.map((task, index) => (
          <View
            key={String(task.id ?? index)}
            style={[
              styles.card,
              { backgroundColor: c.surface, borderColor: c.border },
            ]}
          >
            <Text style={[styles.taskTitle, { color: c.text }]}>
              {taskLabel(task)}
            </Text>
            <Text style={{ color: c.muted }}>
              {task.start_time || "—"} → {task.end_time || "—"}
            </Text>
            {task.remarks ? (
              <Text style={[styles.remarks, { color: c.muted }]}>
                {task.remarks}
              </Text>
            ) : null}
          </View>
        ))
      )}

      <Text style={[styles.section, { color: c.text, marginTop: spacing.md }]}>
        Tracking
      </Text>
      <TrackingMap trackingLogs={day.tracking_logs} height={260} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingBottom: spacing.xxl },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "700" },
  meta: { marginTop: 4, marginBottom: spacing.lg, fontSize: 13 },
  section: { fontSize: 15, fontWeight: "700", marginBottom: spacing.sm },
  card: {
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  taskTitle: { fontWeight: "700", marginBottom: 4 },
  remarks: { marginTop: 6, fontSize: 12 },
  empty: { marginBottom: spacing.md, fontSize: 13 },
  link: { fontWeight: "700", marginTop: 8 },
});
