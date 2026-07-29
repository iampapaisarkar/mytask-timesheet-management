import { useEffect, useState } from "react";
import {
  useCreateTimesheetManagement,
  useEmployeePayrollCycles,
  useEmployees,
} from "@mytask/hooks";
import { getErrorMessage } from "@mytask/utils";
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

export function CreateTimesheetDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const toast = useToastStore();
  const employeesQuery = useEmployees({ rows_per_page: 100 }, open);
  const createMutation = useCreateTimesheetManagement();
  const [employeeId, setEmployeeId] = useState<string>("");
  const [periodKey, setPeriodKey] = useState("");
  const cyclesQuery = useEmployeePayrollCycles(
    employeeId ? Number(employeeId) : undefined,
  );

  const employees = (Array.isArray(employeesQuery.data)
    ? employeesQuery.data
    : []) as EmployeeRow[];
  const periods = (Array.isArray(cyclesQuery.data)
    ? cyclesQuery.data
    : []) as Period[];

  useEffect(() => {
    if (!open) {
      setEmployeeId("");
      setPeriodKey("");
    }
  }, [open]);

  if (!open) return null;

  async function handleCreate() {
    const period = periods.find(
      (p) => `${p.start_date}|${p.end_date}` === periodKey,
    );
    if (!employeeId || !period) {
      toast.warning("Missing fields", "Select an employee and period");
      return;
    }
    try {
      await createMutation.mutateAsync({
        employee: { id: Number(employeeId) },
        period: {
          start_date: period.start_date,
          end_date: period.end_date,
        },
        push_to_xero: false,
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
            onClick={() => void handleCreate()}
          >
            Create
          </Button>
        </>
      }
    >
      <p className="mb-4 text-sm text-muted">
        Choose an employee and payroll period.
      </p>

      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Employee</span>
          <select
            className="mt-focus rounded-xl border border-border bg-[var(--mt-surface)] px-3.5 py-3"
            value={employeeId}
            onChange={(e) => {
              setEmployeeId(e.target.value);
              setPeriodKey("");
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
          <span className="font-medium">Period</span>
          <select
            className="mt-focus rounded-xl border border-border bg-[var(--mt-surface)] px-3.5 py-3"
            value={periodKey}
            onChange={(e) => setPeriodKey(e.target.value)}
            disabled={!employeeId || cyclesQuery.isLoading}
          >
            <option value="">
              {cyclesQuery.isLoading ? "Loading periods…" : "Select period"}
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
        </label>
      </div>
    </FullScreenModal>
  );
}
