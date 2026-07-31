import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTimesheetDayEditorScreen } from "@mytask/hooks";
import { reportsApi, timesheetsApi, timesheetManagementApi } from "@mytask/api";
import { formatHours, formatMoney } from "@mytask/constants";
import { formatDisplayTime, getErrorMessage } from "@mytask/utils";
import { Button } from "@/components/ui/Button";
import { FullScreenModal } from "@/components/ui/FullScreenModal";
import { TextInput } from "@/components/ui/TextInput";
import { ErrorState, LoadingState } from "@/components/ui/States";
import {
  TrackingMapView,
  hasTrackingMapData,
  type TrackingLogs,
  type MapJob,
} from "@/components/maps/TrackingMapView";
import { useToastStore } from "@/store/toastStore";
import { useOrganisationStore } from "@/store/organisationStore";
import {
  TrackedTimeline,
  formatMinutesAsHm,
  sumDurationsByType,
  type TimelineTask,
} from "@/features/timesheet/TrackedTimeline";

type TaskType = "working" | "break" | "travel";

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
};

type DayRateRow = {
  date?: string;
  day_name?: string;
  total_working_hours?: string;
  total_travel_hours?: string;
  total_break_hours?: string;
  total_working_hours_in_decimal?: number;
  total_travel_hours_in_decimal?: number;
  total_break_hours_in_decimal?: number;
  total_original_payout_amount?: number;
  total_payble_amount?: number;
  pay_type?: string;
  currency?: string;
  hourly_rate?: number;
  fixed_rate?: number;
  is_public_holiday?: boolean;
  working_periods?: unknown[];
  travel_periods?: unknown[];
  break_periods?: unknown[];
};

type JobRow = {
  id?: number;
  name?: string;
  radius?: number;
  address?: MapJob["address"];
  details?: {
    id?: number;
    name?: string;
    radius?: number;
    address?: MapJob["address"];
  };
};

const SHEET_COLORS: Record<TaskType, string> = {
  working: "#04B6B1",
  travel: "#7BA3F0",
  break: "#F59E0B",
};

const selectClass =
  "mt-focus w-full rounded-xl border border-border bg-[var(--mt-surface)] px-3.5 py-2.5 text-sm outline-none focus:border-primary";

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

function formatDisplayDate(date?: string, dayName?: string) {
  if (!date) return { title: "Timesheet day", subtitle: dayName || "" };
  try {
    const d = new Date(`${date}T12:00:00`);
    const title = d.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const subtitle =
      dayName ||
      d.toLocaleDateString(undefined, { weekday: "long" });
    return { title, subtitle };
  } catch {
    return { title: date, subtitle: dayName || "" };
  }
}

function taskLabel(task: TaskDraft) {
  if (task.type === "break") return "Break";
  if (task.type === "travel") return "Travel";
  return "Working";
}

function taskSubtitle(
  task: TaskDraft,
  jobOptions: Array<{ id?: number; name: string }>,
  timesheetJobName = "",
) {
  if (task.type !== "working") return null;
  const job = jobOptions.find((j) => String(j.id) === task.job_id);
  const name = job?.name || timesheetJobName;
  return name ? `Job: ${name}` : null;
}

function durationLabel(start: string, end: string) {
  const m = start.match(/^(\d{1,2}):(\d{2})/);
  const n = end.match(/^(\d{1,2}):(\d{2})/);
  if (!m || !n) return "—";
  const a = Number(m[1]) * 60 + Number(m[2]);
  const b = Number(n[1]) * 60 + Number(n[2]);
  if (b <= a) return "—";
  return formatMinutesAsHm(b - a);
}

export function TimesheetDayEditor({
  mode,
  timesheetId,
  dayId,
  employeeId,
  open,
  onClose,
  onSaved,
}: {
  mode: "self" | "management";
  timesheetId: string | number;
  dayId: string | number | null;
  employeeId?: string | number;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const toast = useToastStore();
  const orgEmployeeId = useOrganisationStore(
    (s) => s.organisation?.employee?.id,
  );
  const resolvedEmployeeId = employeeId ?? orgEmployeeId;
  const [tasks, setTasks] = useState<TaskDraft[]>([]);
  const [isPublicHoliday, setIsPublicHoliday] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<"grid" | "map">("grid");
  const [ratesOpen, setRatesOpen] = useState(false);

  const dayQuery = useTimesheetDayEditorScreen(
    { mode, dayId, employeeId },
    open && dayId != null && dayId !== "",
  );

  const day = dayQuery.data as
    | (DayPayload & { available_jobs?: JobRow[] })
    | undefined;
  const canSave = Boolean(day?.permissions?.can_save);

  const jobOptions = useMemo(() => {
    const rows = (Array.isArray(day?.available_jobs)
      ? day.available_jobs
      : []) as JobRow[];
    return rows.map((row) => {
      const id = row.details?.id ?? row.id;
      const name = row.details?.name ?? row.name ?? `Job #${id}`;
      return { id, name, row };
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
        row: j as JobRow,
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
  const timesheetJobName =
    timesheetJobs.length === 1
      ? timesheetJobs[0]?.name || ""
      : day?.timesheet_job?.name || "";
  const multiJob = timesheetJobs.length > 1;

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

  const mapJobs: MapJob[] = useMemo(() => {
    const fromTasks = (day?.tasks || [])
      .map((t) => t.job)
      .filter(Boolean) as MapJob[];
    const fromList = timesheetJobs.map(({ row, id, name }) => ({
      id,
      name,
      radius: (row as JobRow).details?.radius ?? (row as JobRow).radius,
      address: (row as JobRow).details?.address ?? (row as JobRow).address,
    }));
    return [...fromTasks, ...fromList];
  }, [day?.tasks, timesheetJobs]);

  const timelineTasks: TimelineTask[] = useMemo(
    () =>
      tasks.map((t) => ({
        key: t.key,
        type: t.type,
        label: taskLabel(t),
        start_time: t.start_time,
        end_time: t.end_time,
      })),
    [tasks],
  );

  const totals = useMemo(
    () => sumDurationsByType(timelineTasks),
    [timelineTasks],
  );

  const dayRateQuery = useQuery({
    queryKey: [
      "day-rate",
      timesheetId,
      dayId,
      resolvedEmployeeId,
      day?.date,
    ] as const,
    queryFn: async () => {
      const res = await reportsApi.rateByPerTimesheetDay({
        timesheet_id: timesheetId,
        timesheet_day_id: dayId,
        employee_id: resolvedEmployeeId,
        ...(day?.date
          ? {
              from: String(day.date).slice(0, 10),
              to: String(day.date).slice(0, 10),
            }
          : {}),
      });
      return (res.data as { data: DayRateRow[] }).data;
    },
    enabled:
      ratesOpen &&
      Boolean(timesheetId && dayId && resolvedEmployeeId),
  });

  const selectedTask = tasks.find((t) => t.key === expandedKey) || null;
  const { title, subtitle } = formatDisplayDate(day?.date, day?.day_name);

  async function handleSave() {
    for (const task of tasks) {
      if (!task.start_time || !task.end_time) {
        toast.warning("Missing times", "Each task needs start and end time");
        return;
      }
      if (task.type === "working" && !(task.job_id || timesheetJobId)) {
        toast.warning(
          "Job required",
          "This timesheet has no job assigned; working tasks need a job",
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
      onSaved?.();
    } catch (err) {
      toast.error("Save failed", getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function updateTask(key: string, patch: Partial<TaskDraft>) {
    setTasks((prev) =>
      prev.map((t) => (t.key === key ? { ...t, ...patch } : t)),
    );
  }

  function toggleExpand(key: string) {
    setExpandedKey((prev) => (prev === key ? null : key));
  }

  return (
    <>
    <FullScreenModal
      open={open && dayId != null}
      onClose={onClose}
      variant="workspace"
      closeOnBackdrop={false}
      header={
        <div className="flex w-full flex-wrap items-center gap-2 border-b border-border px-3 py-3 sm:gap-6 sm:px-6">
          <div className="min-w-0 flex-1 basis-[10rem]">
            <p className="truncate text-lg font-bold tracking-tight text-[var(--mt-text)] sm:text-2xl">
              {dayQuery.isLoading ? "…" : title}
            </p>
            <p className="truncate text-sm text-muted">{subtitle}</p>
          </div>

          <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:flex-1 sm:justify-center sm:gap-3">
            <SummaryBadge
              icon="work"
              label={formatMinutesAsHm(totals.working)}
            />
            <SummaryBadge
              icon="break"
              label={formatMinutesAsHm(totals.break)}
            />
            <SummaryBadge
              icon="travel"
              label={formatMinutesAsHm(totals.travel)}
            />
            <button
              type="button"
              className="mt-focus inline-flex items-center gap-2 rounded-xl border border-border bg-[var(--mt-bg)] px-3 py-2 text-sm font-medium text-[var(--mt-text)] transition hover:border-primary"
              onClick={() => {
                if (!resolvedEmployeeId) {
                  toast.warning(
                    "Rates",
                    "Unable to resolve employee for this timesheet day.",
                  );
                  return;
                }
                setRatesOpen(true);
              }}
            >
              <span aria-hidden>$</span>
              Rate
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="mt-focus ml-auto inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--mt-muted)] transition hover:bg-primary-muted hover:text-[var(--mt-text)]"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      }
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-6">
          <label className="inline-flex items-center gap-2 text-sm text-[var(--mt-text)]">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={isPublicHoliday}
              disabled={!canSave || dayQuery.isLoading}
              onChange={(e) => setIsPublicHoliday(e.target.checked)}
            />
            Public holiday
          </label>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            {canSave ? (
              <Button loading={saving} onClick={() => void handleSave()}>
                Save day
              </Button>
            ) : null}
          </div>
        </div>
      }
    >
      {dayQuery.isLoading ? (
        <div className="flex h-full items-center justify-center p-8">
          <LoadingState label="Loading day…" />
        </div>
      ) : dayQuery.isError ? (
        <div className="p-8">
          <ErrorState
            message={getErrorMessage(dayQuery.error)}
            onRetry={() => void dayQuery.refetch()}
          />
        </div>
      ) : (
        <div className="flex h-full min-h-0 flex-col lg:flex-row">
          {/* Sheets column */}
          <aside className="flex max-h-[min(42vh,20rem)] w-full shrink-0 flex-col border-b border-border lg:max-h-none lg:w-[280px] lg:border-r lg:border-b-0 xl:w-[340px]">
            <div className="flex items-center justify-between px-4 py-3">
              <h3 className="text-sm font-medium text-muted">Sheets</h3>
              {canSave ? (
                <Button
                  variant="soft"
                  type="button"
                  className="px-2.5 py-1 text-xs"
                  onClick={() => {
                    const t = emptyTask(timesheetJobId);
                    setTasks((prev) => [...prev, t]);
                    setExpandedKey(t.key);
                  }}
                >
                  Add
                </Button>
              ) : null}
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-4">
              {!tasks.length ? (
                <p className="text-sm text-muted">No sheets for this day.</p>
              ) : (
                tasks.map((task) => {
                  const expanded = expandedKey === task.key;
                  const color = SHEET_COLORS[task.type];
                  const sub = taskSubtitle(
                    task,
                    timesheetJobs,
                    timesheetJobName,
                  );
                  return (
                    <div
                      key={task.key}
                      className={`overflow-hidden rounded-2xl transition ${
                        expanded ? "ring-2 ring-primary/40" : ""
                      }`}
                      style={{ background: color }}
                    >
                      <button
                        type="button"
                        className="flex w-full flex-col gap-1 px-4 py-3.5 text-left text-white"
                        onClick={() => toggleExpand(task.key)}
                        aria-expanded={expanded}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-lg font-bold">
                            {taskLabel(task)}
                          </span>
                          <span className="text-xs font-medium opacity-90">
                            {durationLabel(task.start_time, task.end_time)}
                          </span>
                        </div>
                        {sub ? (
                          <span className="text-sm opacity-90">{sub}</span>
                        ) : null}
                      </button>

                      <div
                        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                        }`}
                      >
                        <div className="overflow-hidden">
                          <div className="space-y-3 border-t border-white/20 bg-black/10 px-4 py-3">
                            <label className="flex flex-col gap-1 text-xs font-medium text-white">
                              Type
                              <select
                                className={selectClass}
                                value={task.type}
                                disabled={!canSave}
                                onChange={(e) =>
                                  updateTask(task.key, {
                                    type: e.target.value as TaskType,
                                    job_id:
                                      e.target.value === "working"
                                        ? task.job_id || timesheetJobId
                                        : "",
                                  })
                                }
                              >
                                <option value="working">Working</option>
                                <option value="break">Break</option>
                                <option value="travel">Travel</option>
                              </select>
                            </label>
                            {task.type === "working" ? (
                              multiJob ? (
                                <label className="flex flex-col gap-1 text-xs font-medium text-white">
                                  Job
                                  <select
                                    className={selectClass}
                                    value={task.job_id}
                                    disabled={!canSave}
                                    onChange={(e) =>
                                      updateTask(task.key, {
                                        job_id: e.target.value,
                                      })
                                    }
                                  >
                                    <option value="">Select job</option>
                                    {timesheetJobs.map((job) => (
                                      <option
                                        key={String(job.id)}
                                        value={String(job.id)}
                                      >
                                        {job.name}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              ) : (
                                <div className="rounded-xl border border-white/20 bg-black/10 px-3 py-2 text-xs text-white">
                                  <p className="font-medium opacity-80">Job</p>
                                  <p className="mt-0.5 text-sm font-semibold">
                                    {timesheetJobName ||
                                      timesheetJobs.find(
                                        (j) => String(j.id) === task.job_id,
                                      )?.name ||
                                      "Timesheet job"}
                                  </p>
                                </div>
                              )
                            ) : null}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <TextInput
                                  label="Start"
                                  type="time"
                                  value={task.start_time}
                                  disabled={!canSave}
                                  onChange={(e) =>
                                    updateTask(task.key, {
                                      start_time: e.target.value,
                                    })
                                  }
                                />
                                <p className="mt-1 text-xs text-white/80">
                                  {formatDisplayTime(task.start_time)}
                                </p>
                              </div>
                              <div>
                                <TextInput
                                  label="End"
                                  type="time"
                                  value={task.end_time}
                                  disabled={!canSave}
                                  onChange={(e) =>
                                    updateTask(task.key, {
                                      end_time: e.target.value,
                                    })
                                  }
                                />
                                <p className="mt-1 text-xs text-white/80">
                                  {formatDisplayTime(task.end_time)}
                                </p>
                              </div>
                            </div>
                            <TextInput
                              label="Remarks"
                              value={task.remarks}
                              disabled={!canSave}
                              onChange={(e) =>
                                updateTask(task.key, {
                                  remarks: e.target.value,
                                })
                              }
                            />
                            {canSave ? (
                              <Button
                                variant="danger"
                                type="button"
                                className="w-full"
                                onClick={() => {
                                  setTasks((prev) =>
                                    prev.filter((t) => t.key !== task.key),
                                  );
                                  setExpandedKey((k) =>
                                    k === task.key ? null : k,
                                  );
                                }}
                              >
                                Remove
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          {/* Grid / Map */}
          <section className="flex min-h-0 min-w-0 flex-1 flex-col px-4 py-3 sm:px-6">
            <div
              className="mb-3 flex gap-6 border-b border-border"
              role="tablist"
              aria-label="Day view"
            >
              {(["grid", "map"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={viewTab === tab}
                  className={`relative pb-2.5 text-sm font-semibold capitalize transition ${
                    viewTab === tab
                      ? "text-primary"
                      : "text-muted hover:text-[var(--mt-text)]"
                  }`}
                  onClick={() => setViewTab(tab)}
                >
                  {tab}
                  {viewTab === tab ? (
                    <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />
                  ) : null}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1">
              {viewTab === "grid" ? (
                <TrackedTimeline
                  tasks={timelineTasks}
                  selectedKey={expandedKey}
                  onSelect={(key) => setExpandedKey(key)}
                />
              ) : (
                <div className="flex h-full min-h-[280px] flex-col">
                  {hasTrackingMapData(day?.tracking_logs) ? (
                    <TrackingMapView
                      trackingLogs={day?.tracking_logs}
                      jobs={mapJobs}
                      height="100%"
                      selectedType={selectedTask?.type ?? null}
                      className="min-h-[280px] flex-1"
                    />
                  ) : (
                    <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted">
                      No GPS tracking for this day — timeline still shows
                      manual sheets.
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </FullScreenModal>

    {ratesOpen ? (
      <FullScreenModal
        open={ratesOpen}
        onClose={() => setRatesOpen(false)}
        title={`Day rate · ${title}${subtitle ? ` · ${subtitle}` : ""}`}
      >
        {dayRateQuery.isLoading ? (
          <LoadingState label="Calculating day rate…" />
        ) : dayRateQuery.isError ? (
          <ErrorState
            message={getErrorMessage(dayRateQuery.error)}
            onRetry={() => void dayRateQuery.refetch()}
          />
        ) : (
          <DayRateBreakdown rows={dayRateQuery.data || []} />
        )}
      </FullScreenModal>
    ) : null}
    </>
  );
}

function DayRateBreakdown({ rows }: { rows: DayRateRow[] }) {
  if (!rows.length) {
    return (
      <p className="text-sm text-muted">
        No rate data for this day yet. Add working time and wage rates first.
      </p>
    );
  }

  const currency = rows[0]?.currency || "AUD";
  const totalAmount = rows.reduce(
    (acc, r) => acc + (Number(r.total_payble_amount) || 0),
    0,
  );
  const totalWork = rows.reduce(
    (acc, r) => acc + (Number(r.total_working_hours_in_decimal) || 0),
    0,
  );

  return (
    <div className="flex flex-col gap-4 p-1">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-muted">Working</p>
          <p className="mt-1 text-lg font-semibold">
            {formatHours(
              rows[0]?.total_working_hours_in_decimal ?? totalWork,
            )}
          </p>
        </div>
        <div className="rounded-xl border border-border px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-muted">Break</p>
          <p className="mt-1 text-lg font-semibold">
            {formatHours(rows[0]?.total_break_hours_in_decimal ?? 0)}
          </p>
        </div>
        <div className="rounded-xl border border-border px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-muted">Travel</p>
          <p className="mt-1 text-lg font-semibold">
            {formatHours(rows[0]?.total_travel_hours_in_decimal ?? 0)}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border px-3 py-3">
        <p className="text-xs uppercase tracking-wide text-muted">
          Payable for this day
        </p>
        <p className="mt-1 text-2xl font-semibold text-primary">
          {formatMoney(totalAmount, currency)}
        </p>
        <p className="mt-1 text-sm text-muted">
          {rows[0]?.pay_type === "FIXED"
            ? `Fixed wage · ${formatMoney(rows[0]?.fixed_rate, currency)} period rate`
            : `Hourly · ${formatMoney(rows[0]?.hourly_rate, currency)} / hour`}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border text-muted">
            <tr>
              <th className="px-2 py-1.5 font-medium">Day</th>
              <th className="px-2 py-1.5 font-medium">Work</th>
              <th className="px-2 py-1.5 font-medium">Break</th>
              <th className="px-2 py-1.5 font-medium">Travel</th>
              <th className="px-2 py-1.5 font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={String(row.date)}
                className="border-b border-border last:border-0"
              >
                <td className="px-2 py-1.5">
                  {row.date}
                  {row.day_name ? ` · ${row.day_name}` : ""}
                  {row.is_public_holiday ? " · PH" : ""}
                </td>
                <td className="px-2 py-1.5">
                  {formatHours(row.total_working_hours_in_decimal)}
                </td>
                <td className="px-2 py-1.5">
                  {formatHours(row.total_break_hours_in_decimal)}
                </td>
                <td className="px-2 py-1.5">
                  {formatHours(row.total_travel_hours_in_decimal)}
                </td>
                <td className="px-2 py-1.5">
                  {formatMoney(row.total_payble_amount, row.currency || currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryBadge({
  icon,
  label,
}: {
  icon: "work" | "break" | "travel";
  label: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-[var(--mt-bg)] px-3 py-2 text-sm text-[var(--mt-text)]">
      <span className="text-muted" aria-hidden>
        {icon === "break" ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2 21h18v-2H2v2zm6-4h5a6 6 0 0 0 6-6V3H4v8a6 6 0 0 0 4 5.65V17zm-2-6V5h10v6a4 4 0 0 1-4 4H8a4 4 0 0 1-2-3.46V11zM20 3h2v6a4 4 0 0 1-4 4h-1v-2h1a2 2 0 0 0 2-2V3z" />
          </svg>
        ) : icon === "travel" ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21.71 8.71c1.25-1.25.68-2.71 0-3.42l-3-3c-.7-.7-2.17-1.25-3.42 0L13.41 4.17l6.42 6.42 1.88-1.88zM3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" />
          </svg>
        )}
      </span>
      <span className="font-medium tabular-nums">{label}</span>
    </div>
  );
}
