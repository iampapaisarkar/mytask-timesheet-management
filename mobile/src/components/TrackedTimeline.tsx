import { useMemo } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
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
  working: "#04B6B1",
  break: "#F59E0B",
  travel: "#5B8DEF",
};

const PX_PER_MIN = 1.05;

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

  const { rangeStart, rangeEnd, height, ticks } = useMemo(() => {
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
      rangeEnd: re,
      height: Math.max(280, (re - rs) * PX_PER_MIN),
      ticks: list,
    };
  }, [tasks]);

  function labelFor(mins: number) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  return (
    <View style={styles.wrap}>
      <Text style={[styles.heading, { color: c.text }]}>Tracked Timeline</Text>
      <ScrollView
        style={[styles.scroll, { borderColor: c.border, backgroundColor: c.surface }]}
        nestedScrollEnabled
      >
        <View style={{ height, minWidth: 260 }}>
          {ticks.map((t) => {
            const top = (t - rangeStart) * PX_PER_MIN;
            const isHour = t % 60 === 0;
            return (
              <View key={t} style={[styles.tickRow, { top }]}>
                <Text
                  style={[
                    styles.tickLabel,
                    { color: isHour ? c.text : c.muted },
                  ]}
                >
                  {labelFor(t)}
                </Text>
                <View
                  style={[
                    styles.tickLine,
                    { borderTopColor: c.border, opacity: isHour ? 1 : 0.5 },
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
            const barH = Math.max(24, (b - a) * PX_PER_MIN);
            const selected = selectedKey === task.key;
            return (
              <Pressable
                key={task.key}
                onPress={() => onSelect(task.key)}
                style={[
                  styles.bar,
                  {
                    top,
                    height: barH,
                    backgroundColor: TYPE_COLORS[task.type],
                    borderWidth: selected ? 2 : 0,
                    borderColor: "#fff",
                  },
                ]}
              >
                <Text style={styles.barLabel} numberOfLines={1}>
                  {task.label}
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
  heading: { fontSize: 16, fontWeight: "700", marginBottom: 10 },
  scroll: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
  },
  tickRow: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  tickLabel: {
    width: 48,
    fontSize: 10,
    textAlign: "right",
    paddingRight: 6,
  },
  tickLine: {
    flex: 1,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 6,
  },
  bar: {
    position: "absolute",
    left: 56,
    right: 10,
    borderRadius: 8,
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  barLabel: { color: "#fff", fontSize: 12, fontWeight: "700" },
});
