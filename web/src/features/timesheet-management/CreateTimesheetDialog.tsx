import { useEffect, useMemo, useState } from "react";
import {
  useCreateTimesheetManagement,
  useEmployeePayrollCycles,
  useEmployees,
  useJobs,
} from "@mytask/hooks";
import { getErrorMessage, listRows } from "@mytask/utils";
import { Button } from "@/components/ui/Button";
import { FullScreenModal } from "@/components/ui/FullScreenModal";
import { useToastStore } from "@/store/toastStore";

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
  const [employeeId, setEmployeeId] = useState("");
  const [periodKey, setPeriodKey] = useState("");
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const cyclesQuery = useEmployeePayrollCycles(
    employeeId ? Number(employeeId) : undefined,
  );

  const employees = listRows<EmployeeRow>(employeesQuery.data);
  const periods = (Array.isArray(cyclesQuery.data)
    ? cyclesQuery.data
    : []) as Period[];
  const jobs = listRows<JobRow>(jobsQuery.data);

  const canCreate = Boolean(
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
      setEmployeeId("");
      setPeriodKey("");
      setSelectedJobIds([]);
    }
  }, [open]);

  if (!open) return null;

  function toggleJob(id: string) {
    setSelectedJobIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleCreate() {
    const period = periods.find(
      (p) => `${p.start_date}|${p.end_date}` === periodKey,
    );
    if (!employeeId) {
      toast.warning("Employee required", "Select an employee");
      return;
    }
    if (!period) {
      toast.warning("Period required", "Select a pay period");
      return;
    }
    if (!selectedJobIds.length) {
      toast.warning("Jobs required", "Select at least one job");
      return;
    }
    try {
      await createMutation.mutateAsync({
        employee: { id: Number(employeeId) },
        period: {
          start_date: period.start_date,
          end_date: period.end_date,
        },
        jobs: selectedJobIds.map((id) => ({ id: Number(id) })),
      });
      toast.success("Timesheet created");
      onClose();
    } catch (err) {
      toast.error("Create failed", getErrorMessage(err));
    }
  }

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
            disabled={!canCreate || createMutation.isPending}
            onClick={() => void handleCreate()}
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
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">1. Employee</span>
          <select
            className={selectClass}
            value={employeeId}
            onChange={(e) => {
              setEmployeeId(e.target.value);
              setPeriodKey("");
              setSelectedJobIds([]);
            }}
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
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">2. Pay period</span>
          <select
            className={selectClass}
            value={periodKey}
            onChange={(e) => {
              setPeriodKey(e.target.value);
              setSelectedJobIds([]);
            }}
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
          {employeeId && cyclesQuery.isError ? (
            <span className="text-xs text-warning">
              {getErrorMessage(
                cyclesQuery.error,
                "Could not load periods for this employee",
              )}
            </span>
          ) : null}
        </label>

        <div className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">3. Jobs (select one or more)</span>
          <div
            className={`max-h-56 space-y-2 overflow-y-auto rounded-xl border border-border p-3 ${
              !periodKey ? "opacity-50" : ""
            }`}
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
                const checked = selectedJobIds.includes(id);
                return (
                  <label
                    key={id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-primary-muted/40"
                  >
                    <input
                      type="checkbox"
                      className="accent-[var(--mt-primary,#04B6B1)]"
                      checked={checked}
                      onChange={() => toggleJob(id)}
                    />
                    <span>{jobLabel(job)}</span>
                  </label>
                );
              })
            )}
          </div>
          {!canCreate ? (
            <span className="text-xs text-muted">
              Employee, period, and at least one job are required.
            </span>
          ) : null}
        </div>

        {canCreate ? (
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
