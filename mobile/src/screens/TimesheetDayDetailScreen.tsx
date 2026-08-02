import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  timesheetManagementApi,
  timesheetsApi,
} from "@mytask/api";
import { useTimesheetDayEditorScreen } from "@mytask/hooks";
import { spacing } from "@mytask/theme";
import { formatDisplayTimeRange, getErrorMessage, resolveOpenEndTime } from "@mytask/utils";
import { validateTimesheetDayTaskRow } from "@mytask/validation";
import {
  TrackingMap,
  type TrackingLogs,
} from "../components/TrackingMap";
import { LiveTrackingIndicator } from "../components/LiveTrackingIndicator";
import { SkeletonDetail } from "../components/Skeleton";
import {
  TrackedTimeline,
  formatMinutesAsHm,
  sumDurationsByType,
  type TimelineTask,
  type TimelineTaskType,
} from "../components/TrackedTimeline";
import { useLiveClock } from "../hooks/useLiveClock";
import { useTrackingLive } from "../hooks/useTrackingLive";
import type { OrgStackParamList } from "../navigation/types";
import { useOrganisationStore } from "../store/organisationStore";
import { useThemeStore, type AppColors } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";
import {
  Button,
  EmptyState,
  ErrorState,
  PlusIcon,
  SegmentedControl,
  statusVisual,
} from "../ui";

type Props = NativeStackScreenProps<OrgStackParamList, "TimesheetDayDetail">;

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
    key: `task-${task.id ?? index}`,
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

export function TimesheetDayDetailScreen({ route }: Props) {
  const { dayId, timesheetId, mode: modeParam, employeeId: employeeParam } =
    route.params;
  const mode = modeParam ?? "self";
  const c = useThemeStore((s) => s.colors);
  const toast = useToastStore();
  const insets = useSafeAreaInsets();
  const orgEmployeeId = useOrganisationStore(
    (s) => s.organisation?.employee?.id,
  );
  const organisationId = useOrganisationStore((s) => s.organisation?.id);
  const resolvedEmployeeId = employeeParam ?? orgEmployeeId;

  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [tab, setTab] = useState<ViewTab>("sheets");
  const [tasks, setTasks] = useState<TaskDraft[]>([]);
  const [taskErrors, setTaskErrors] = useState<
    Record<string, Partial<Record<"job_id" | "start_time" | "end_time", string>>>
  >({});
  const [isPublicHoliday, setIsPublicHoliday] = useState(false);
  const [saving, setSaving] = useState(false);

  const dayQuery = useTimesheetDayEditorScreen(
    { mode, dayId, employeeId: resolvedEmployeeId },
    true,
  );

  const trackingLive = useTrackingLive(organisationId, {
    timesheetDayId: dayId,
    timesheetId,
    employeeId: resolvedEmployeeId,
  });

  useEffect(() => {
    if (!trackingLive) return;
    const id = globalThis.setInterval(() => {
      void dayQuery.refetch();
    }, 5_000);
    return () => globalThis.clearInterval(id);
  }, [trackingLive, dayQuery]);

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
    setExpandedKey((prev) =>
      prev && drafts.some((d) => d.key === prev)
        ? prev
        : (drafts[0]?.key ?? null),
    );
  }, [day]);

  const hasOpenTask = tasks.some(
    (t) => Boolean(t.start_time?.trim()) && !t.end_time?.trim(),
  );
  const liveNow = useLiveClock(Boolean(trackingLive || hasOpenTask));

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
        end_time: resolveOpenEndTime(
          t.end_time,
          t.start_time?.trim() && !t.end_time?.trim() ? liveNow : null,
        ),
      })),
    [tasks, liveNow],
  );

  const totals = useMemo(
    () => sumDurationsByType(timelineTasks),
    [timelineTasks],
  );

  function updateTask(key: string, patch: Partial<TaskDraft>) {
    setTasks((prev) =>
      prev.map((t) => (t.key === key ? { ...t, ...patch } : t)),
    );
    setTaskErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function handleSave() {
    const nextErrors: Record<
      string,
      Partial<Record<"job_id" | "start_time" | "end_time", string>>
    > = {};
    let firstInvalidKey: string | null = null;

    for (const task of tasks) {
      const rowErrors = validateTimesheetDayTaskRow(task, timesheetJobId);
      if (Object.keys(rowErrors).length) {
        nextErrors[task.key] = rowErrors;
        if (!firstInvalidKey) firstInvalidKey = task.key;
      }
    }

    if (firstInvalidKey) {
      setTaskErrors(nextErrors);
      setExpandedKey(firstInvalidKey);
      setTab("sheets");
      return;
    }

    setTaskErrors({});
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
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <SkeletonDetail />
      </View>
    );
  }

  if (dayQuery.isError || !day) {
    return (
      <View style={[styles.flex, { backgroundColor: c.bg }]}>
        <ErrorState
          title="Failed to load day"
          onRetry={() => void dayQuery.refetch()}
        />
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
          {trackingLive ? <LiveTrackingIndicator compact /> : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.badges}
        >
          <SummaryChip
            label="Work"
            value={formatMinutesAsHm(totals.working)}
            type="working"
            theme={c}
          />
          <SummaryChip
            label="Break"
            value={formatMinutesAsHm(totals.break)}
            type="break"
            theme={c}
          />
          <SummaryChip
            label="Travel"
            value={formatMinutesAsHm(totals.travel)}
            type="travel"
            theme={c}
          />
        </ScrollView>

        {canSave ? (
          <View
            style={[
              styles.holidayRow,
              { backgroundColor: c.bgMuted, borderColor: c.border },
            ]}
          >
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
          <KeyboardAwareScrollView
            contentContainerStyle={{
              padding: spacing.md,
              paddingBottom: canSave ? 120 : spacing.xxl,
            }}
            keyboardShouldPersistTaps="handled"
            bottomOffset={canSave ? 100 : 24}
            extraKeyboardSpace={16}
            showsVerticalScrollIndicator={false}
          >
            {!tasks.length ? (
              <EmptyState title="No sheets for this day" />
            ) : (
              tasks.map((task) => {
                const expanded = expandedKey === task.key;
                const jobName =
                  timesheetJobs.find((j) => String(j.id) === task.job_id)
                    ?.name ||
                  jobOptions.find((j) => String(j.id) === task.job_id)?.name;
                const visual = statusVisual(c, task.type);
                const displayEnd = resolveOpenEndTime(
                  task.end_time,
                  task.start_time?.trim() && !task.end_time?.trim()
                    ? liveNow
                    : null,
                );
                return (
                  <View
                    key={task.key}
                    style={[
                      styles.sheetCard,
                      { backgroundColor: visual.solid },
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
                          {durationLabel(task.start_time, displayEnd)}
                        </Text>
                      </View>
                      {task.type === "working" && jobName ? (
                        <Text style={styles.sheetSub}>Job: {jobName}</Text>
                      ) : null}
                      {!expanded ? (
                        <Text style={styles.sheetMeta} numberOfLines={1}>
                          {formatDisplayTimeRange(
                            task.start_time,
                            displayEnd || task.end_time,
                          )}
                        </Text>
                      ) : null}
                    </Pressable>

                    {expanded ? (
                      <View style={styles.sheetExpand}>
                        {canSave ? (
                          <EditFields
                            task={task}
                            errors={taskErrors[task.key]}
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
                              setTaskErrors((prev) => {
                                const next = { ...prev };
                                delete next[task.key];
                                return next;
                              });
                              setExpandedKey(null);
                            }}
                          />
                        ) : (
                          <>
                            <Text style={styles.sheetMeta} numberOfLines={1}>
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
              <Button
                title="Add sheet"
                variant="soft"
                leftIcon={<PlusIcon color={c.secondary} size={18} />}
                onPress={() => {
                  const next = emptyTask(timesheetJobId);
                  setTasks((prev) => [...prev, next]);
                  setExpandedKey(next.key);
                  setTab("sheets");
                }}
                style={styles.addBtn}
              />
            ) : null}
          </KeyboardAwareScrollView>
        ) : null}

        {tab === "timeline" ? (
          <View style={styles.timelinePane}>
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
          <View style={styles.mapPane}>
            <TrackingMap
              trackingLogs={day.tracking_logs}
              selectedType={
                expandedKey
                  ? timelineTasks.find((t) => t.key === expandedKey)?.type ??
                    null
                  : null
              }
            />
          </View>
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
          <Button
            title={saving ? "Saving…" : "Save day"}
            onPress={() => void handleSave()}
            loading={saving}
          />
        </View>
      ) : null}
    </View>
  );
}

function SummaryChip({
  label,
  value,
  type,
  theme,
}: {
  label: string;
  value: string;
  type: TaskType;
  theme: AppColors;
}) {
  const visual = statusVisual(theme, type);
  return (
    <View
      style={[
        styles.badge,
        { borderColor: visual.border, backgroundColor: visual.bg },
      ]}
    >
      <View style={[styles.badgeDot, { backgroundColor: visual.solid }]} />
      <View>
        <Text style={{ color: theme.muted, fontSize: 10, fontWeight: "600" }}>
          {label}
        </Text>
        <Text style={{ color: visual.text, fontSize: 13, fontWeight: "700" }}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function EditFields({
  task,
  jobs,
  errors,
  onChange,
  onRemove,
}: {
  task: TaskDraft;
  jobs: Array<{ id?: number; name?: string }>;
  errors?: Partial<Record<"job_id" | "start_time" | "end_time", string>>;
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
          error={errors?.start_time}
          onChangeText={(start_time) => onChange({ start_time })}
          placeholder="09:00"
        />
        <Field
          label="End"
          value={task.end_time}
          error={errors?.end_time}
          onChangeText={(end_time) => onChange({ end_time })}
          placeholder="17:00"
        />
      </View>
      {task.type === "working" && jobs.length > 1 ? (
        <>
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
          {errors?.job_id ? (
            <Text style={styles.fieldError}>{errors.job_id}</Text>
          ) : null}
        </>
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
  error,
  onChangeText,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  error?: string;
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
        style={[
          styles.fieldInput,
          multiline && { minHeight: 64 },
          error ? styles.fieldInputError : null,
        ]}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  dateTitle: { fontSize: 22, fontWeight: "700" },
  badges: { gap: 8, paddingRight: 8 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  badgeDot: { width: 8, height: 8, borderRadius: 4 },
  holidayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  body: { flex: 1 },
  tabPane: { flex: 1, padding: spacing.md },
  timelinePane: { flex: 1 },
  mapPane: { flex: 1 },
  sheetCard: {
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },
  sheetRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  sheetName: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    flexShrink: 1,
  },
  sheetDur: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  sheetSub: { color: "rgba(255,255,255,0.9)", marginTop: 4, fontSize: 13 },
  sheetExpand: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.25)",
  },
  sheetMeta: {
    color: "rgba(255,255,255,0.95)",
    fontSize: 12,
    marginTop: 4,
    fontVariant: ["tabular-nums"],
  },
  addBtn: { marginTop: 4 },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
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
  fieldInputError: {
    borderColor: "#fecaca",
  },
  fieldError: {
    color: "#fecaca",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
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
