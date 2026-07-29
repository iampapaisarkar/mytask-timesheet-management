import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { jobsApi, timesheetsApi, timesheetManagementApi } from "@mytask/api";
import { getErrorMessage } from "@mytask/utils";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { ErrorState, LoadingState } from "@/components/ui/States";
import {
  TrackingMapView,
  hasTrackingMapData,
  type TrackingLogs,
  type MapJob,
} from "@/components/maps/TrackingMapView";
import { useToastStore } from "@/store/toastStore";

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
  status?: { code?: string; name?: string };
};

type JobRow = {
  id?: number;
  name?: string;
  radius?: number;
  address?: MapJob["address"];
  details?: { id?: number; name?: string; radius?: number; address?: MapJob["address"] };
};

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

function draftFromTask(task: DayTask, index: number): TaskDraft {
  return {
    key: `task-${task.id ?? index}-${Math.random().toString(36).slice(2, 7)}`,
    type: taskTypeFromFlags(task),
    job_id: task.job?.id != null ? String(task.job.id) : "",
    start_time: normalizeTime(task.start_time),
    end_time: normalizeTime(task.end_time),
    remarks: task.remarks || "",
  };
}

function emptyTask(): TaskDraft {
  return {
    key: `new-${Math.random().toString(36).slice(2, 9)}`,
    type: "working",
    job_id: "",
    start_time: "09:00",
    end_time: "17:00",
    remarks: "",
  };
}

function buildSaveTasks(tasks: TaskDraft[]) {
  return tasks.map((task) => ({
    is_break: task.type === "break",
    is_travel: task.type === "travel",
    job:
      task.type === "working" && task.job_id
        ? { id: Number(task.job_id) }
        : null,
    start_time: toHhMmSs(task.start_time),
    end_time: toHhMmSs(task.end_time),
    remarks: task.remarks || null,
  }));
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
  const [tasks, setTasks] = useState<TaskDraft[]>([]);
  const [isPublicHoliday, setIsPublicHoliday] = useState(false);
  const [saving, setSaving] = useState(false);

  const dayQuery = useQuery({
    queryKey: ["timesheet-day", mode, dayId, employeeId] as const,
    queryFn: async () => {
      if (mode === "management") {
        const res = await timesheetManagementApi.getDay(dayId!, {
          employee_id: employeeId,
        });
        return (res.data as { data: DayPayload }).data;
      }
      const res = await timesheetsApi.getDay(dayId!);
      return (res.data as { data: DayPayload }).data;
    },
    enabled: open && dayId != null && dayId !== "",
  });

  const jobsQuery = useQuery({
    queryKey: ["jobs-for-day-editor"] as const,
    queryFn: async () => {
      const res = await jobsApi.list({ rows_per_page: 100, sort_by: "id" });
      return res.data.data as JobRow[];
    },
    enabled: open,
  });

  const day = dayQuery.data;
  const canSave = Boolean(day?.permissions?.can_save);

  useEffect(() => {
    if (!day) return;
    setIsPublicHoliday(Boolean(day.is_public_holiday));
    setTasks(
      Array.isArray(day.tasks) && day.tasks.length
        ? day.tasks.map(draftFromTask)
        : [],
    );
  }, [day]);

  const jobOptions = useMemo(() => {
    const rows = Array.isArray(jobsQuery.data) ? jobsQuery.data : [];
    return rows.map((row) => {
      const id = row.details?.id ?? row.id;
      const name = row.details?.name ?? row.name ?? `Job #${id}`;
      return { id, name, row };
    });
  }, [jobsQuery.data]);

  const mapJobs: MapJob[] = useMemo(() => {
    const fromTasks = (day?.tasks || [])
      .map((t) => t.job)
      .filter(Boolean) as MapJob[];
    const fromList = jobOptions.map(({ row, id, name }) => ({
      id,
      name,
      radius: row.details?.radius ?? row.radius,
      address: row.details?.address ?? row.address,
    }));
    return [...fromTasks, ...fromList];
  }, [day?.tasks, jobOptions]);

  if (!open || dayId == null) return null;

  async function handleSave() {
    for (const task of tasks) {
      if (!task.start_time || !task.end_time) {
        toast.warning("Missing times", "Each task needs start and end time");
        return;
      }
      if (task.type === "working" && !task.job_id) {
        toast.warning("Job required", "Working tasks need a job");
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        id: Number(dayId),
        is_public_holiday: isPublicHoliday,
        tasks: buildSaveTasks(tasks),
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

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close day editor"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-[var(--mt-surface)] shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--mt-text)]">
              {day?.date || "Timesheet day"}
            </h2>
            <p className="text-sm text-muted">
              {day?.day_name || "Edit tasks"}
              {day?.status?.name ? ` · ${day.status.name}` : ""}
            </p>
          </div>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {dayQuery.isLoading ? (
            <LoadingState label="Loading day…" />
          ) : dayQuery.isError ? (
            <ErrorState
              message={getErrorMessage(dayQuery.error)}
              onRetry={() => void dayQuery.refetch()}
            />
          ) : (
            <div className="flex flex-col gap-4">
              <label className="inline-flex items-center gap-2 text-sm text-[var(--mt-text)]">
                <input
                  type="checkbox"
                  checked={isPublicHoliday}
                  disabled={!canSave}
                  onChange={(e) => setIsPublicHoliday(e.target.checked)}
                />
                Public holiday
              </label>

              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-[var(--mt-text)]">
                  Tasks
                </h3>
                {canSave ? (
                  <Button
                    variant="soft"
                    type="button"
                    onClick={() => setTasks((prev) => [...prev, emptyTask()])}
                  >
                    Add task
                  </Button>
                ) : null}
              </div>

              {!tasks.length ? (
                <p className="text-sm text-muted">No tasks for this day.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {tasks.map((task) => (
                    <div
                      key={task.key}
                      className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-2"
                    >
                      <label className="flex flex-col gap-1.5 text-sm">
                        <span className="font-medium">Type</span>
                        <select
                          className="mt-focus rounded-xl border border-border bg-[var(--mt-surface)] px-3.5 py-3"
                          value={task.type}
                          disabled={!canSave}
                          onChange={(e) =>
                            updateTask(task.key, {
                              type: e.target.value as TaskType,
                              job_id:
                                e.target.value === "working" ? task.job_id : "",
                            })
                          }
                        >
                          <option value="working">Working</option>
                          <option value="break">Break</option>
                          <option value="travel">Travel</option>
                        </select>
                      </label>

                      <label className="flex flex-col gap-1.5 text-sm">
                        <span className="font-medium">Job</span>
                        <select
                          className="mt-focus rounded-xl border border-border bg-[var(--mt-surface)] px-3.5 py-3 disabled:opacity-55"
                          value={task.job_id}
                          disabled={!canSave || task.type !== "working"}
                          onChange={(e) =>
                            updateTask(task.key, { job_id: e.target.value })
                          }
                        >
                          <option value="">Select job</option>
                          {jobOptions.map((job) => (
                            <option key={String(job.id)} value={String(job.id)}>
                              {job.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <TextInput
                        label="Start"
                        type="time"
                        value={task.start_time}
                        disabled={!canSave}
                        onChange={(e) =>
                          updateTask(task.key, { start_time: e.target.value })
                        }
                      />
                      <TextInput
                        label="End"
                        type="time"
                        value={task.end_time}
                        disabled={!canSave}
                        onChange={(e) =>
                          updateTask(task.key, { end_time: e.target.value })
                        }
                      />
                      <div className="sm:col-span-2">
                        <TextInput
                          label="Remarks"
                          value={task.remarks}
                          disabled={!canSave}
                          onChange={(e) =>
                            updateTask(task.key, { remarks: e.target.value })
                          }
                        />
                      </div>
                      {canSave ? (
                        <div className="sm:col-span-2">
                          <Button
                            variant="danger"
                            type="button"
                            onClick={() =>
                              setTasks((prev) =>
                                prev.filter((t) => t.key !== task.key),
                              )
                            }
                          >
                            Remove task
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}

              {hasTrackingMapData(day?.tracking_logs) ? (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-[var(--mt-text)]">
                    Tracking map
                  </h3>
                  <TrackingMapView
                    trackingLogs={day?.tracking_logs}
                    jobs={mapJobs}
                  />
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-4">
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
    </div>
  );
}
