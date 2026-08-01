import { useEffect, useMemo } from "react";
import { Controller } from "react-hook-form";
import { clsx } from "clsx";
import {
  useCreateTimesheetManagement,
  useEmployeePayrollCycles,
  useEmployees,
  useJobs,
} from "@mytask/hooks";
import {
  createTimesheetSchema,
  type CreateTimesheetFormValues,
} from "@mytask/validation";
import { getErrorMessage, listRows } from "@mytask/utils";
import { Button } from "@/components/ui/Button";
import { FullScreenModal } from "@/components/ui/FullScreenModal";
import { useToastStore } from "@/store/toastStore";
import { useAppForm, useValidatedSubmit } from "@/hooks/useAppForm";

type EmployeeRow = {
  details?: { id?: number; full_name?: string; email?: string };
  id?: number;
};

type Period = {
  start_date: string;
  end_date: string;
  label: string;
};

type JobRow = {
  id?: number;
  name?: string;
  details?: { id?: number; name?: string };
};

const selectClass =
  "mt-focus rounded-xl border border-border bg-[var(--mt-surface)] px-3.5 py-3 text-[var(--mt-text)] outline-none focus:border-primary disabled:opacity-50";

const emptyTimesheet: CreateTimesheetFormValues = {
  employee_id: "",
  period_key: "",
  job_ids: [],
};

function jobKey(job: JobRow) {
  return String(job.details?.id ?? job.id ?? "");
}

function jobLabel(job: JobRow) {
  return job.details?.name || job.name || `Job #${jobKey(job)}`;
}

export function CreateTimesheetDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const toast = useToastStore();
  const employeesQuery = useEmployees({ rows_per_page: 200 }, open);
  const jobsQuery = useJobs({ rows_per_page: 200 }, open);
  const createMutation = useCreateTimesheetManagement();

  const form = useAppForm<CreateTimesheetFormValues>({
    schema: createTimesheetSchema,
    defaultValues: emptyTimesheet,
  });
  const {
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const employeeId = watch("employee_id");
  const periodKey = watch("period_key");
  const selectedJobIds = watch("job_ids");

  const cyclesQuery = useEmployeePayrollCycles(
    employeeId ? Number(employeeId) : undefined,
  );

  const employees = listRows<EmployeeRow>(employeesQuery.data);
  const periods = (Array.isArray(cyclesQuery.data)
    ? cyclesQuery.data
    : []) as Period[];
  const jobs = listRows<JobRow>(jobsQuery.data);

  const canShowSummary = Boolean(
    employeeId && periodKey && selectedJobIds.length > 0,
  );

  const selectedSummary = useMemo(() => {
    const emp = employees.find(
      (e) => String(e.details?.id ?? e.id) === employeeId,
    );
    const period = periods.find(
      (p) => `${p.start_date}|${p.end_date}` === periodKey,
    );
    const selectedJobs = jobs.filter((j) =>
      selectedJobIds.includes(jobKey(j)),
    );
    return {
      employee:
        emp?.details?.full_name ||
        emp?.details?.email ||
        (employeeId ? `Employee #${employeeId}` : ""),
      period: period?.label || "",
      jobs: selectedJobs.map(jobLabel),
    };
  }, [employees, periods, jobs, employeeId, periodKey, selectedJobIds]);

  useEffect(() => {
    if (!open) {
      reset(emptyTimesheet);
    }
  }, [open, reset]);

  const handleCreate = useValidatedSubmit(form, async (values) => {
    const period = periods.find(
      (p) => `${p.start_date}|${p.end_date}` === values.period_key,
    );
    if (!period) return;
    try {
      await createMutation.mutateAsync({
        employee: { id: Number(values.employee_id) },
        period: {
          start_date: period.start_date,
          end_date: period.end_date,
        },
        jobs: values.job_ids.map((id) => ({ id: Number(id) })),
      });
      toast.success("Timesheet created");
      onClose();
    } catch (err) {
      toast.error("Create failed", getErrorMessage(err));
    }
  });

  if (!open) return null;

  return (
    <FullScreenModal
      open={open}
      onClose={onClose}
      title="Create timesheet"
      variant="form"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={createMutation.isPending}
            disabled={createMutation.isPending}
            onClick={handleCreate}
          >
            Create Timesheet
          </Button>
        </>
      }
    >
      <p className="mb-4 text-sm text-muted">
        Select employee, pay period, then one or more jobs. The same job can be
        used by multiple employees.
      </p>

      <div className="flex flex-col gap-3">
        <Controller
          name="employee_id"
          control={control}
          render={({ field }) => (
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">1. Employee</span>
              <select
                className={clsx(
                  selectClass,
                  errors.employee_id && "border-negative",
                )}
                value={field.value}
                onChange={(e) => {
                  field.onChange(e.target.value);
                  setValue("period_key", "");
                  setValue("job_ids", []);
                }}
                onBlur={field.onBlur}
              >
                <option value="">Select employee</option>
                {employees.map((emp) => {
                  const id = emp.details?.id ?? emp.id;
                  const label =
                    emp.details?.full_name ||
                    emp.details?.email ||
                    `Employee #${id}`;
                  return (
                    <option key={String(id)} value={String(id)}>
                      {label}
                    </option>
                  );
                })}
              </select>
              {errors.employee_id?.message ? (
                <span className="text-xs text-negative">
                  {errors.employee_id.message}
                </span>
              ) : null}
            </label>
          )}
        />

        <Controller
          name="period_key"
          control={control}
          render={({ field }) => (
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">2. Pay period</span>
              <select
                className={clsx(
                  selectClass,
                  errors.period_key && "border-negative",
                )}
                value={field.value}
                onChange={(e) => {
                  field.onChange(e.target.value);
                  setValue("job_ids", []);
                }}
                onBlur={field.onBlur}
                disabled={!employeeId || cyclesQuery.isLoading}
              >
                <option value="">
                  {cyclesQuery.isLoading
                    ? "Loading periods…"
                    : cyclesQuery.isError
                      ? "Unable to load periods"
                      : "Select period"}
                </option>
                {periods.map((p) => (
                  <option
                    key={`${p.start_date}|${p.end_date}`}
                    value={`${p.start_date}|${p.end_date}`}
                  >
                    {p.label}
                  </option>
                ))}
              </select>
              {errors.period_key?.message ? (
                <span className="text-xs text-negative">
                  {errors.period_key.message}
                </span>
              ) : null}
              {employeeId && cyclesQuery.isError ? (
                <span className="text-xs text-warning">
                  {getErrorMessage(
                    cyclesQuery.error,
                    "Could not load periods for this employee",
                  )}
                </span>
              ) : null}
            </label>
          )}
        />

        <Controller
          name="job_ids"
          control={control}
          render={({ field }) => (
            <div className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">3. Jobs (select one or more)</span>
              <div
                className={clsx(
                  "max-h-56 space-y-2 overflow-y-auto rounded-xl border p-3",
                  errors.job_ids ? "border-negative" : "border-border",
                  !periodKey ? "opacity-50" : "",
                )}
              >
                {!periodKey ? (
                  <p className="text-xs text-muted">Select a period first</p>
                ) : jobsQuery.isLoading ? (
                  <p className="text-xs text-muted">Loading jobs…</p>
                ) : jobs.length === 0 ? (
                  <p className="text-xs text-muted">
                    No jobs available. Create a job first.
                  </p>
                ) : (
                  jobs.map((job) => {
                    const id = jobKey(job);
                    const checked = field.value.includes(id);
                    return (
                      <label
                        key={id}
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-primary-muted/40"
                      >
                        <input
                          type="checkbox"
                          className="accent-[var(--mt-primary,#04B6B1)]"
                          checked={checked}
                          onChange={() => {
                            const next = checked
                              ? field.value.filter((x) => x !== id)
                              : [...field.value, id];
                            field.onChange(next);
                          }}
                        />
                        <span>{jobLabel(job)}</span>
                      </label>
                    );
                  })
                )}
              </div>
              {errors.job_ids?.message ? (
                <span className="text-xs text-negative">
                  {errors.job_ids.message}
                </span>
              ) : null}
            </div>
          )}
        />

        {canShowSummary ? (
          <div className="rounded-xl border border-border bg-[var(--mt-surface)]/60 p-3 text-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Summary
            </p>
            <p className="mt-1 text-[var(--mt-text)]">
              {selectedSummary.employee}
            </p>
            <p className="text-muted">{selectedSummary.period}</p>
            <p className="font-medium text-[var(--mt-text)]">
              {selectedSummary.jobs.join(", ")}
            </p>
          </div>
        ) : null}
      </div>
    </FullScreenModal>
  );
}
