import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { timesheetsApi } from "@mytask/api";
import { spacing } from "@mytask/theme";
import { formatDisplayTimeRange } from "@mytask/utils";
import {
  TrackingMap,
  type TrackingLogs,
} from "../components/TrackingMap";
import {
  TrackedTimeline,
  formatMinutesAsHm,
  sumDurationsByType,
  type TimelineTask,
  type TimelineTaskType,
} from "../components/TrackedTimeline";
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

const SHEET_COLORS: Record<TimelineTaskType, string> = {
  working: "#04B6B1",
  travel: "#7BA3F0",
  break: "#F59E0B",
};

function taskType(task: DayTask): TimelineTaskType {
  if (task.is_break) return "break";
  if (task.is_travel) return "travel";
  return "working";
}

function taskTitle(task: DayTask) {
  if (task.is_break) return "Break";
  if (task.is_travel) return "Travel";
  return "Working";
}

function parseMinutes(value?: string | null): number | null {
  if (!value) return null;
  const m = value.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function durationLabel(start?: string | null, end?: string | null) {
  const a = parseMinutes(start);
  const b = parseMinutes(end);
  if (a == null || b == null || b <= a) return "—";
  return formatMinutesAsHm(b - a);
}

function formatHeaderDate(date?: string, dayName?: string) {
  if (!date) return { title: "Day detail", subtitle: dayName || "" };
  try {
    const d = new Date(`${date}T12:00:00`);
    return {
      title: d.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      subtitle:
        dayName ||
        d.toLocaleDateString(undefined, { weekday: "long" }),
    };
  } catch {
    return { title: date, subtitle: dayName || "" };
  }
}

export function TimesheetDayDetailScreen({ route, navigation }: Props) {
  const { dayId } = route.params;
  const c = useThemeStore((s) => s.colors);
  const insets = useSafeAreaInsets();
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [tab, setTab] = useState<"grid" | "map">("grid");

  const query = useQuery({
    queryKey: ["timesheet-day", dayId] as const,
    queryFn: async () => {
      const res = await timesheetsApi.getDay(dayId);
      return (res.data as { data: DayPayload }).data;
    },
  });

  const tasks = useMemo(
    () => (Array.isArray(query.data?.tasks) ? query.data!.tasks : []),
    [query.data],
  );

  const timelineTasks: TimelineTask[] = useMemo(
    () =>
      tasks.map((t, i) => ({
        key: String(t.id ?? i),
        type: taskType(t),
        label: taskTitle(t),
        start_time: t.start_time || "",
        end_time: t.end_time || "",
      })),
    [tasks],
  );

  const totals = useMemo(
    () => sumDurationsByType(timelineTasks),
    [timelineTasks],
  );

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
        <Pressable onPress={() => void query.refetch()}>
          <Text style={[styles.link, { color: c.primary }]}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const day = query.data;
  const { title, subtitle } = formatHeaderDate(day.date, day.day_name);

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: c.surface,
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
    >
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.dateTitle, { color: c.text }]}>{title}</Text>
            <Text style={{ color: c.muted, fontSize: 13 }}>{subtitle}</Text>
          </View>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            accessibilityLabel="Close"
          >
            <Text style={[styles.close, { color: c.muted }]}>✕</Text>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.badges}
        >
          <Badge label={formatMinutesAsHm(totals.working)} color={c} />
          <Badge label={formatMinutesAsHm(totals.break)} color={c} />
          <Badge label={formatMinutesAsHm(totals.travel)} color={c} />
          <Badge label="$ Rate" color={c} />
        </ScrollView>
      </View>

      <View style={styles.body}>
        <View
          style={[
            styles.sheetsCol,
            { borderBottomColor: c.border },
          ]}
        >
          <Text style={[styles.sheetsTitle, { color: c.muted }]}>Sheets</Text>
          <ScrollView contentContainerStyle={{ paddingBottom: spacing.lg }}>
            {!tasks.length ? (
              <Text style={{ color: c.muted, fontSize: 13 }}>No sheets</Text>
            ) : (
              tasks.map((task, index) => {
                const key = String(task.id ?? index);
                const type = taskType(task);
                const expanded = expandedKey === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() =>
                      setExpandedKey((prev) => (prev === key ? null : key))
                    }
                    style={[
                      styles.sheetCard,
                      { backgroundColor: SHEET_COLORS[type] },
                    ]}
                  >
                    <View style={styles.sheetRow}>
                      <Text style={styles.sheetName}>{taskTitle(task)}</Text>
                      <Text style={styles.sheetDur}>
                        {durationLabel(task.start_time, task.end_time)}
                      </Text>
                    </View>
                    {type === "working" && task.job?.name ? (
                      <Text style={styles.sheetSub}>
                        Job: {task.job.name}
                      </Text>
                    ) : null}
                    {expanded ? (
                      <View style={styles.sheetExpand}>
                        <Text style={styles.sheetMeta}>
                          {formatDisplayTimeRange(
                            task.start_time,
                            task.end_time,
                          )}
                        </Text>
                        {task.remarks ? (
                          <Text style={styles.sheetMeta}>{task.remarks}</Text>
                        ) : null}
                      </View>
                    ) : null}
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>

        <View style={styles.rightCol}>
          <View style={[styles.tabs, { borderBottomColor: c.border }]}>
            {(["grid", "map"] as const).map((t) => (
              <Pressable key={t} onPress={() => setTab(t)} style={styles.tabBtn}>
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: tab === t ? c.primary : c.muted,
                      fontWeight: tab === t ? "700" : "500",
                    },
                  ]}
                >
                  {t === "grid" ? "Grid" : "Map"}
                </Text>
                {tab === t ? (
                  <View
                    style={[styles.tabUnderline, { backgroundColor: c.primary }]}
                  />
                ) : null}
              </Pressable>
            ))}
          </View>
          <View style={styles.tabBody}>
            {tab === "grid" ? (
              <TrackedTimeline
                tasks={timelineTasks}
                selectedKey={expandedKey}
                onSelect={setExpandedKey}
              />
            ) : (
              <TrackingMap
                trackingLogs={day.tracking_logs}
                height={320}
                selectedType={
                  expandedKey
                    ? timelineTasks.find((t) => t.key === expandedKey)?.type ??
                      null
                    : null
                }
              />
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

function Badge({
  label,
  color,
}: {
  label: string;
  color: { border: string; bg: string; text: string };
}) {
  return (
    <View
      style={[
        styles.badge,
        { borderColor: color.border, backgroundColor: color.bg },
      ]}
    >
      <Text style={{ color: color.text, fontSize: 12, fontWeight: "600" }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  link: { fontWeight: "700", marginTop: 8 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  dateTitle: { fontSize: 22, fontWeight: "700" },
  close: { fontSize: 20, padding: 4 },
  badges: { gap: 8, paddingRight: 8 },
  badge: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  body: { flex: 1, flexDirection: "column" },
  sheetsCol: {
    maxHeight: "42%",
    paddingHorizontal: 12,
    paddingTop: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetsTitle: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  sheetCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  sheetRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sheetName: { color: "#fff", fontSize: 17, fontWeight: "700" },
  sheetDur: { color: "rgba(255,255,255,0.9)", fontSize: 12, fontWeight: "600" },
  sheetSub: { color: "rgba(255,255,255,0.9)", marginTop: 4, fontSize: 13 },
  sheetExpand: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.25)",
  },
  sheetMeta: { color: "rgba(255,255,255,0.95)", fontSize: 12, marginTop: 2 },
  rightCol: { flex: 1, paddingHorizontal: 12, paddingTop: 8 },
  tabs: {
    flexDirection: "row",
    gap: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  tabBtn: { paddingBottom: 8 },
  tabLabel: { fontSize: 14, textTransform: "capitalize" },
  tabUnderline: { height: 2, borderRadius: 1, marginTop: 6 },
  tabBody: { flex: 1, minHeight: 220 },
});
