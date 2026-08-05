import { useMemo } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { formatMinutesAsDisplayTime } from "@mytask/utils";
import { activityColors, radii, spacing, typography } from "@mytask/theme";
import { useThemeStore } from "../store/themeStore";

export type TimelineTaskType = "working" | "break" | "travel";

export type TimelineTask = {
  key: string;
  type: TimelineTaskType;
  label: string;
  start_time: string;
  end_time: string;
};

const TYPE_COLORS: Record<TimelineTaskType, string> = {
  working: activityColors.working,
  break: activityColors.break,
  travel: activityColors.travel,
};

const PX_PER_MIN = 1.15;
const AXIS_WIDTH = 72;

function parseMinutes(value?: string | null): number | null {
  if (!value) return null;
  const m = value.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function sumDurationsByType(tasks: TimelineTask[]) {
  const totals = { working: 0, break: 0, travel: 0 };
  for (const t of tasks) {
    const a = parseMinutes(t.start_time);
    const b = parseMinutes(t.end_time);
    if (a == null || b == null || b <= a) continue;
    totals[t.type] += b - a;
  }
  return totals;
}

export function formatMinutesAsHm(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

function compactAxisTime(mins: number): string {
  const label = formatMinutesAsDisplayTime(mins);
  // Keep "9:00 AM" on one line — slightly tighter spacing via NBSP-free string
  return label.replace(/\s+/g, " ");
}

function barTimeRange(start: string, end: string): string {
  const a = parseMinutes(start);
  const b = parseMinutes(end);
  if (a == null || b == null) return "";
  return `${compactAxisTime(a)} – ${compactAxisTime(b)}`;
}

export function TrackedTimeline({
  tasks,
  selectedKey,
  onSelect,
}: {
  tasks: TimelineTask[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
}) {
  const c = useThemeStore((s) => s.colors);

  const { rangeStart, height, ticks } = useMemo(() => {
    const starts = tasks
      .map((t) => parseMinutes(t.start_time))
      .filter((n): n is number => n != null);
    const ends = tasks
      .map((t) => parseMinutes(t.end_time))
      .filter((n): n is number => n != null);
    let rs = starts.length ? Math.min(...starts) : 8 * 60;
    let re = ends.length ? Math.max(...ends) : 18 * 60;
    rs = Math.floor(rs / 30) * 30 - 30;
    re = Math.ceil(re / 30) * 30 + 30;
    if (re <= rs) re = rs + 8 * 60;
    const list: number[] = [];
    for (let t = rs; t <= re; t += 30) list.push(t);
    return {
      rangeStart: rs,
      height: Math.max(320, (re - rs) * PX_PER_MIN),
      ticks: list,
    };
  }, [tasks]);

  return (
    <View style={[styles.wrap, { backgroundColor: c.bg }]}>
      <View style={styles.headingRow}>
        <Text style={[styles.heading, { color: c.text }]}>Tracked timeline</Text>
        <View style={styles.legend}>
          {(
            [
              ["working", "Work"],
              ["break", "Break"],
              ["travel", "Travel"],
            ] as const
          ).map(([type, label]) => (
            <View key={type} style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: TYPE_COLORS[type] }]}
              />
              <Text style={[styles.legendText, { color: c.muted }]}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      <ScrollView
        style={[styles.scroll, { backgroundColor: c.surface }]}
        contentContainerStyle={styles.scrollContent}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
      >
        <View style={{ height }}>
          {ticks.map((t) => {
            const top = (t - rangeStart) * PX_PER_MIN;
            const isHour = t % 60 === 0;
            return (
              <View key={t} style={[styles.tickRow, { top }]}>
                <Text
                  style={[
                    styles.tickLabel,
                    {
                      color: isHour ? c.text : c.muted,
                      fontWeight: isHour ? "700" : "500",
                    },
                  ]}
                  numberOfLines={1}
                >
                  {compactAxisTime(t)}
                </Text>
                <View
                  style={[
                    styles.tickLine,
                    {
                      borderTopColor: isHour ? c.borderStrong : c.border,
                      opacity: isHour ? 1 : 0.55,
                    },
                  ]}
                />
              </View>
            );
          })}

          {tasks.map((task) => {
            const a = parseMinutes(task.start_time);
            const b = parseMinutes(task.end_time);
            if (a == null || b == null || b <= a) return null;
            const top = (a - rangeStart) * PX_PER_MIN;
            const barH = Math.max(28, (b - a) * PX_PER_MIN);
            const selected = selectedKey === task.key;
            const range = barTimeRange(task.start_time, task.end_time);
            const line =
              barH >= 34 && range
                ? `${task.label}  ·  ${range}`
                : range || task.label;
            return (
              <Pressable
                key={task.key}
                accessibilityRole="button"
                accessibilityLabel={`${task.label} ${range}`}
                onPress={() => onSelect(task.key)}
                style={[
                  styles.bar,
                  {
                    top,
                    height: barH,
                    backgroundColor: TYPE_COLORS[task.type],
                    borderColor: selected ? c.white : "transparent",
                    borderWidth: selected ? 2 : 0,
                  },
                ]}
              >
                <Text style={styles.barLabel} numberOfLines={1}>
                  {line}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  headingRow: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: 8,
  },
  heading: {
    fontSize: typography.sizes.md,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: typography.sizes.xs,
    fontWeight: "600",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  tickRow: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    height: 18,
    marginTop: -9,
  },
  tickLabel: {
    width: AXIS_WIDTH,
    fontSize: 11,
    textAlign: "right",
    paddingRight: 10,
    fontVariant: ["tabular-nums"],
  },
  tickLine: {
    flex: 1,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  bar: {
    position: "absolute",
    left: AXIS_WIDTH,
    right: 0,
    borderTopLeftRadius: radii.sm,
    borderBottomLeftRadius: radii.sm,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    paddingHorizontal: 12,
    justifyContent: "center",
    gap: 2,
  },
  barLabel: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.1,
    fontVariant: ["tabular-nums"],
  },
});
