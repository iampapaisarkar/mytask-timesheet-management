import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  timesheetManagementApi,
  timesheetsApi,
} from "@mytask/api";
import { useTimesheetDayEditorScreen } from "@mytask/hooks";
import { spacing } from "@mytask/theme";
import { formatDisplayTimeRange, getErrorMessage } from "@mytask/utils";
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
import { useOrganisationStore } from "../store/organisationStore";
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";
import { CloseIcon, PlusIcon, SegmentedControl } from "../ui";

type Props = NativeStackScreenProps<RootStackParamList, "TimesheetDayDetail">;

type TaskType = TimelineTaskType;

type TaskDraft = {
  key: string;
  type: TaskType;
  job_id: string;
  start_time: string;
  end_time: string;
  remarks: string;
};

type DayTask = {
  id?: number;
  is_break?: boolean;
  is_travel?: boolean;
  start_time?: string;
  end_time?: string;
  remarks?: string | null;
  job?: { id?: number; name?: string } | null;
};

type JobRow = {
  id?: number;
  name?: string;
  details?: { id?: number; name?: string };
};

type DayPayload = {
  id?: number;
  date?: string;
  day_name?: string;
  is_public_holiday?: boolean;
  remarks?: string | null;
  tasks?: DayTask[];
  tracking_logs?: TrackingLogs;
  permissions?: { can_save?: boolean };
  timesheet_job?: { id?: number; name?: string } | null;
  timesheet_jobs?: Array<{ id?: number; name?: string }> | null;
  available_jobs?: JobRow[];
};

const SHEET_COLORS: Record<TaskType, string> = {
  working: "#04B6B1",
  travel: "#7BA3F0",
  break: "#F59E0B",
};

type ViewTab = "sheets" | "timeline" | "map";

function normalizeTime(value?: string | null) {
  if (!value) return "";
  const trimmed = value.trim();
  if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) return trimmed.slice(0, 5);
  if (/^\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  return trimmed.slice(0, 5);
}

function toHhMmSs(value: string) {
  if (/^\d{2}:\d{2}:\d{2}$/.test(value)) return value;
  if (/^\d{2}:\d{2}$/.test(value)) return `${value}:00`;
  return value;
}

function taskTypeFromFlags(task: DayTask): TaskType {
  if (task.is_break) return "break";
  if (task.is_travel) return "travel";
  return "working";
}

function draftFromTask(
  task: DayTask,
  index: number,
  defaultJobId = "",
): TaskDraft {
  const type = taskTypeFromFlags(task);
  return {
    key: `task-${task.id ?? index}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    job_id:
      type === "working"
        ? task.job?.id != null
          ? String(task.job.id)
          : defaultJobId
        : "",
    start_time: normalizeTime(task.start_time),
    end_time: normalizeTime(task.end_time),
    remarks: task.remarks || "",
  };
}

function emptyTask(defaultJobId = ""): TaskDraft {
  return {
    key: `new-${Math.random().toString(36).slice(2, 9)}`,
    type: "working",
    job_id: defaultJobId,
    start_time: "09:00",
    end_time: "17:00",
    remarks: "",
  };
}

function buildSaveTasks(tasks: TaskDraft[], defaultJobId = "") {
  return tasks.map((task) => {
    const jobId =
      task.type === "working" ? task.job_id || defaultJobId : "";
    return {
      is_break: task.type === "break",
      is_travel: task.type === "travel",
      job: jobId ? { id: Number(jobId) } : null,
      start_time: toHhMmSs(task.start_time),
      end_time: toHhMmSs(task.end_time),
      remarks: task.remarks || null,
    };
  });
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

export function TimesheetDayDetailScreen({ route, navigation }: Props) {
  const { dayId, timesheetId, mode: modeParam, employeeId: employeeParam } =
    route.params;
  const mode = modeParam ?? "self";
  const c = useThemeStore((s) => s.colors);
  const toast = useToastStore();
  const insets = useSafeAreaInsets();
  const orgEmployeeId = useOrganisationStore(
    (s) => s.organisation?.employee?.id,
  );
  const resolvedEmployeeId = employeeParam ?? orgEmployeeId;

  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [tab, setTab] = useState<ViewTab>("sheets");
  const [tasks, setTasks] = useState<TaskDraft[]>([]);
  const [isPublicHoliday, setIsPublicHoliday] = useState(false);
  const [saving, setSaving] = useState(false);

  const dayQuery = useTimesheetDayEditorScreen(
    { mode, dayId, employeeId: resolvedEmployeeId },
    true,
  );

  const day = dayQuery.data as DayPayload | undefined;
  const canSave = Boolean(day?.permissions?.can_save);

  const jobOptions = useMemo(() => {
    const rows = (Array.isArray(day?.available_jobs)
      ? day.available_jobs
      : []) as JobRow[];
    return rows.map((row) => {
      const id = row.details?.id ?? row.id;
      const name = row.details?.name ?? row.name ?? `Job #${id}`;
      return { id, name };
    });
  }, [day?.available_jobs]);

  const timesheetJobs = useMemo(() => {
    const fromTs = Array.isArray(day?.timesheet_jobs)
      ? day.timesheet_jobs
      : day?.timesheet_job
        ? [day.timesheet_job]
        : [];
    if (fromTs.length) {
      return fromTs.map((j) => ({
        id: j.id,
        name: j.name || `Job #${j.id}`,
      }));
    }
    return jobOptions;
  }, [day?.timesheet_jobs, day?.timesheet_job, jobOptions]);

  const timesheetJobId =
    timesheetJobs.length === 1 && timesheetJobs[0]?.id != null
      ? String(timesheetJobs[0].id)
      : day?.timesheet_job?.id != null
        ? String(day.timesheet_job.id)
        : "";

  useEffect(() => {
    if (!day) return;
    setIsPublicHoliday(Boolean(day.is_public_holiday));
    const fromTs = Array.isArray(day.timesheet_jobs)
      ? day.timesheet_jobs
      : day.timesheet_job
        ? [day.timesheet_job]
        : [];
    const defaultJob =
      fromTs.length === 1 && fromTs[0]?.id != null
        ? String(fromTs[0].id)
        : day.timesheet_job?.id != null
          ? String(day.timesheet_job.id)
          : "";
    const drafts =
      Array.isArray(day.tasks) && day.tasks.length
        ? day.tasks.map((t, i) => draftFromTask(t, i, defaultJob))
        : [];
    setTasks(drafts);
    setExpandedKey(drafts[0]?.key ?? null);
  }, [day]);

  const timelineTasks: TimelineTask[] = useMemo(
    () =>
      tasks.map((t) => ({
        key: t.key,
        type: t.type,
        label:
          t.type === "break"
            ? "Break"
            : t.type === "travel"
              ? "Travel"
              : "Working",
        start_time: t.start_time,
        end_time: t.end_time,
      })),
    [tasks],
  );

  const totals = useMemo(
    () => sumDurationsByType(timelineTasks),
    [timelineTasks],
  );

  function updateTask(key: string, patch: Partial<TaskDraft>) {
    setTasks((prev) =>
      prev.map((t) => (t.key === key ? { ...t, ...patch } : t)),
    );
  }

  async function handleSave() {
    for (const task of tasks) {
      if (!task.start_time || !task.end_time) {
        toast.warning("Missing times", "Each task needs start and end time");
        return;
      }
      if (task.type === "working" && !(task.job_id || timesheetJobId)) {
        toast.warning(
          "Job required",
          "Working tasks need a job on this timesheet",
        );
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        id: Number(dayId),
        is_public_holiday: isPublicHoliday,
        tasks: buildSaveTasks(tasks, timesheetJobId),
      };
      if (mode === "management") {
        await timesheetManagementApi.save(timesheetId, payload);
      } else {
        await timesheetsApi.save(timesheetId, payload);
      }
      toast.success("Saved", "Timesheet day updated");
      await dayQuery.refetch();
    } catch (err) {
      toast.error("Save failed", getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (dayQuery.isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  if (dayQuery.isError || !day) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <Text style={{ color: c.text }}>Failed to load day</Text>
        <Pressable onPress={() => void dayQuery.refetch()}>
          <Text style={[styles.link, { color: c.primary }]}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const { title, subtitle } = formatHeaderDate(day.date, day.day_name);

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: c.surface,
            borderBottomColor: c.border,
          },
        ]}
      >
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.dateTitle, { color: c.text }]}>{title}</Text>
            <Text style={{ color: c.muted, fontSize: 13 }}>{subtitle}</Text>
          </View>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            accessibilityLabel="Close"
            style={styles.closeBtn}
          >
            <CloseIcon color={c.muted} />
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.badges}
        >
          <SummaryChip
            label="Work"
            value={formatMinutesAsHm(totals.working)}
            color={SHEET_COLORS.working}
            theme={c}
          />
          <SummaryChip
            label="Break"
            value={formatMinutesAsHm(totals.break)}
            color={SHEET_COLORS.break}
            theme={c}
          />
          <SummaryChip
            label="Travel"
            value={formatMinutesAsHm(totals.travel)}
            color={SHEET_COLORS.travel}
            theme={c}
          />
        </ScrollView>

        {canSave ? (
          <View style={styles.holidayRow}>
            <Text style={{ color: c.text, fontWeight: "600", fontSize: 13 }}>
              Public holiday
            </Text>
            <Switch
              value={isPublicHoliday}
              onValueChange={setIsPublicHoliday}
              trackColor={{ true: c.primary, false: c.border }}
            />
          </View>
        ) : null}

        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { value: "sheets", label: "Sheets" },
            { value: "timeline", label: "Timeline" },
            { value: "map", label: "Map" },
          ]}
        />
      </View>

      <View style={styles.body}>
        {tab === "sheets" ? (
          <ScrollView
            contentContainerStyle={{
              padding: spacing.md,
              paddingBottom: canSave ? 100 : spacing.xxl,
            }}
            keyboardShouldPersistTaps="handled"
          >
            {!tasks.length ? (
              <Text style={{ color: c.muted, fontSize: 14, textAlign: "center" }}>
                No sheets for this day
              </Text>
            ) : (
              tasks.map((task) => {
                const expanded = expandedKey === task.key;
                const jobName =
                  timesheetJobs.find((j) => String(j.id) === task.job_id)
                    ?.name ||
                  jobOptions.find((j) => String(j.id) === task.job_id)?.name;
                return (
                  <View
                    key={task.key}
                    style={[
                      styles.sheetCard,
                      { backgroundColor: SHEET_COLORS[task.type] },
                    ]}
                  >
                    <Pressable
                      onPress={() =>
                        setExpandedKey((prev) =>
                          prev === task.key ? null : task.key,
                        )
                      }
                    >
                      <View style={styles.sheetRow}>
                        <Text style={styles.sheetName}>
                          {task.type === "break"
                            ? "Break"
                            : task.type === "travel"
                              ? "Travel"
                              : "Working"}
                        </Text>
                        <Text style={styles.sheetDur}>
                          {durationLabel(task.start_time, task.end_time)}
                        </Text>
                      </View>
                      {task.type === "working" && jobName ? (
                        <Text style={styles.sheetSub}>Job: {jobName}</Text>
                      ) : null}
                      {!expanded ? (
                        <Text style={styles.sheetMeta}>
                          {formatDisplayTimeRange(
                            task.start_time,
                            task.end_time,
                          )}
                        </Text>
                      ) : null}
                    </Pressable>

                    {expanded ? (
                      <View style={styles.sheetExpand}>
                        {canSave ? (
                          <EditFields
                            task={task}
                            jobs={
                              timesheetJobs.length
                                ? timesheetJobs
                                : jobOptions
                            }
                            onChange={(patch) => updateTask(task.key, patch)}
                            onRemove={() => {
                              setTasks((prev) =>
                                prev.filter((t) => t.key !== task.key),
                              );
                              setExpandedKey(null);
                            }}
                          />
                        ) : (
                          <>
                            <Text style={styles.sheetMeta}>
                              {formatDisplayTimeRange(
                                task.start_time,
                                task.end_time,
                              )}
                            </Text>
                            {task.remarks ? (
                              <Text style={styles.sheetMeta}>
                                {task.remarks}
                              </Text>
                            ) : null}
                          </>
                        )}
                      </View>
                    ) : null}
                  </View>
                );
              })
            )}

            {canSave ? (
              <Pressable
                onPress={() => {
                  const next = emptyTask(timesheetJobId);
                  setTasks((prev) => [...prev, next]);
                  setExpandedKey(next.key);
                  setTab("sheets");
                }}
                style={[
                  styles.addBtn,
                  { borderColor: c.border, backgroundColor: c.surface },
                ]}
              >
                <PlusIcon color={c.primary} />
                <Text style={{ color: c.primary, fontWeight: "700" }}>
                  Add sheet
                </Text>
              </Pressable>
            ) : null}
          </ScrollView>
        ) : null}

        {tab === "timeline" ? (
          <View style={styles.tabPane}>
            <TrackedTimeline
              tasks={timelineTasks}
              selectedKey={expandedKey}
              onSelect={(key) => {
                setExpandedKey(key);
                setTab("sheets");
              }}
            />
          </View>
        ) : null}

        {tab === "map" ? (
          <ScrollView contentContainerStyle={styles.tabPane}>
            <TrackingMap
              trackingLogs={day.tracking_logs}
              height={420}
              selectedType={
                expandedKey
                  ? timelineTasks.find((t) => t.key === expandedKey)?.type ??
                    null
                  : null
              }
            />
          </ScrollView>
        ) : null}
      </View>

      {canSave ? (
        <View
          style={[
            styles.footer,
            {
              backgroundColor: c.surface,
              borderTopColor: c.border,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          <Pressable
            onPress={() => void handleSave()}
            disabled={saving}
            style={[
              styles.saveBtn,
              { backgroundColor: c.primary, opacity: saving ? 0.7 : 1 },
            ]}
          >
            <Text style={styles.saveText}>
              {saving ? "Saving…" : "Save day"}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function SummaryChip({
  label,
  value,
  color,
  theme,
}: {
  label: string;
  value: string;
  color: string;
  theme: { border: string; bg: string; text: string; muted: string };
}) {
  return (
    <View
      style={[
        styles.badge,
        { borderColor: theme.border, backgroundColor: theme.bg },
      ]}
    >
      <View style={[styles.badgeDot, { backgroundColor: color }]} />
      <View>
        <Text style={{ color: theme.muted, fontSize: 10, fontWeight: "600" }}>
          {label}
        </Text>
        <Text style={{ color: theme.text, fontSize: 13, fontWeight: "700" }}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function EditFields({
  task,
  jobs,
  onChange,
  onRemove,
}: {
  task: TaskDraft;
  jobs: Array<{ id?: number; name?: string }>;
  onChange: (patch: Partial<TaskDraft>) => void;
  onRemove: () => void;
}) {
  return (
    <View style={{ gap: 10 }}>
      <View style={styles.typeRow}>
        {(["working", "break", "travel"] as TaskType[]).map((type) => (
          <Pressable
            key={type}
            onPress={() => onChange({ type })}
            style={[
              styles.typeChip,
              {
                backgroundColor:
                  task.type === type
                    ? "rgba(255,255,255,0.35)"
                    : "rgba(255,255,255,0.12)",
              },
            ]}
          >
            <Text style={styles.typeChipText}>
              {type === "working"
                ? "Work"
                : type === "break"
                  ? "Break"
                  : "Travel"}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.timeRow}>
        <Field
          label="Start"
          value={task.start_time}
          onChangeText={(start_time) => onChange({ start_time })}
          placeholder="09:00"
        />
        <Field
          label="End"
          value={task.end_time}
          onChangeText={(end_time) => onChange({ end_time })}
          placeholder="17:00"
        />
      </View>
      {task.type === "working" && jobs.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {jobs.map((job) => {
            const id = String(job.id);
            const active = task.job_id === id;
            return (
              <Pressable
                key={id}
                onPress={() => onChange({ job_id: id })}
                style={[
                  styles.jobChip,
                  {
                    backgroundColor: active
                      ? "rgba(255,255,255,0.4)"
                      : "rgba(255,255,255,0.15)",
                  },
                ]}
              >
                <Text style={styles.jobChipText}>{job.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
      <Field
        label="Remarks"
        value={task.remarks}
        onChangeText={(remarks) => onChange({ remarks })}
        placeholder="Optional notes"
        multiline
      />
      <Pressable onPress={onRemove}>
        <Text style={styles.removeText}>Remove sheet</Text>
      </Pressable>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.55)"
        multiline={multiline}
        style={[styles.fieldInput, multiline && { minHeight: 64 }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  link: { fontWeight: "700", marginTop: 8 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  dateTitle: { fontSize: 22, fontWeight: "700" },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  badges: { gap: 8, paddingRight: 8 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  badgeDot: { width: 8, height: 8, borderRadius: 4 },
  holidayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  body: { flex: 1 },
  tabPane: { flex: 1, padding: spacing.md },
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
  sheetDur: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
    fontWeight: "600",
  },
  sheetSub: { color: "rgba(255,255,255,0.9)", marginTop: 4, fontSize: 13 },
  sheetExpand: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.25)",
  },
  sheetMeta: { color: "rgba(255,255,255,0.95)", fontSize: 12, marginTop: 4 },
  addBtn: {
    marginTop: 4,
    borderWidth: 1,
    borderRadius: 14,
    borderStyle: "dashed",
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  saveBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  typeRow: { flexDirection: "row", gap: 8 },
  typeChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  typeChipText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  timeRow: { flexDirection: "row", gap: 10 },
  fieldLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 4,
  },
  fieldInput: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.35)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: "#fff",
    fontWeight: "600",
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  jobChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  jobChipText: { color: "#fff", fontWeight: "600", fontSize: 12 },
  removeText: {
    color: "rgba(255,255,255,0.9)",
    fontWeight: "700",
    textAlign: "center",
    marginTop: 4,
  },
});
