import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportsApi, timesheetManagementApi } from "@mytask/api";
import { useEmployees } from "@mytask/hooks";
import { getErrorMessage } from "@mytask/utils";
import { Card, PageHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/States";

type EmployeeRow = {
  id?: number;
  details?: { id?: number; full_name?: string; email?: string };
};

type TimesheetRow = {
  id?: number;
  code?: string;
  period_range?: string;
  period_start_date?: string;
  period_end_date?: string;
  status?: { name?: string; code?: string };
  employee?: { id?: number; details?: { id?: number } };
};

type RateDayRow = {
  date?: string;
  day_name?: string;
  total_working_hours?: string;
  total_travel_hours?: string;
  total_break_hours?: string;
  total_original_payout_amount?: number;
  total_payble_amount?: number;
  earning_rate_percent?: number;
  is_public_holiday?: boolean;
};

/** Match Vue: rateByPerTimesheetDay({ timesheet_id, employee_id, from, to }) */
function periodParams(ts: TimesheetRow | undefined) {
  const from = ts?.period_start_date
    ? String(ts.period_start_date).slice(0, 10)
    : undefined;
  const to = ts?.period_end_date
    ? String(ts.period_end_date).slice(0, 10)
    : undefined;
  return { from, to };
}

export function ReportsPage() {
  const [employeeId, setEmployeeId] = useState("");
  const [timesheetId, setTimesheetId] = useState("");
  const employeesQuery = useEmployees({ rows_per_page: 100, sort_by: "id" });

  const employees = (Array.isArray(employeesQuery.data)
    ? employeesQuery.data
    : []) as EmployeeRow[];

  const timesheetsQuery = useQuery({
    queryKey: ["reports-timesheets", employeeId] as const,
    queryFn: async () => {
      const res = await timesheetManagementApi.list({
        rows_per_page: 100,
        sort_by: "id",
        sort_direction: "desc",
      });
      const rows = (res.data.data || []) as TimesheetRow[];
      const eid = Number(employeeId);
      return rows.filter((row) => {
        const id = row.employee?.details?.id ?? row.employee?.id;
        return id === eid;
      });
    },
    enabled: Boolean(employeeId),
  });

  const timesheets = Array.isArray(timesheetsQuery.data)
    ? timesheetsQuery.data
    : [];

  const selectedTimesheet = timesheets.find(
    (ts) => String(ts.id) === String(timesheetId),
  );

  const rateQuery = useQuery({
    queryKey: [
      "reports-rate",
      employeeId,
      timesheetId,
      selectedTimesheet?.period_start_date,
      selectedTimesheet?.period_end_date,
    ] as const,
    queryFn: async () => {
      const { from, to } = periodParams(selectedTimesheet);
      const res = await reportsApi.rateByPerTimesheetDay({
        employee_id: employeeId,
        timesheet_id: timesheetId,
        // Vue Index-31gw6HeB.js passes period_start_date / period_end_date as from / to
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
      });
      return (res.data as { data: RateDayRow[] }).data;
    },
    enabled: Boolean(employeeId && timesheetId),
  });

  const rateRows = useMemo(() => {
    const data = rateQuery.data;
    return Array.isArray(data) ? data : [];
  }, [rateQuery.data]);

  return (
    <div className="mt-fade-in flex flex-col gap-4">
      <PageHeader
        title="Reports"
        description="Rate breakdown by timesheet day"
      />

      <Card className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-[var(--mt-text)]">Employee</span>
          <select
            className="mt-focus rounded-xl border border-border bg-[var(--mt-surface)] px-3.5 py-3"
            value={employeeId}
            onChange={(e) => {
              setEmployeeId(e.target.value);
              setTimesheetId("");
            }}
          >
            <option value="">Select employee</option>
            {employees.map((emp) => {
              const id = emp.details?.id ?? emp.id;
              return (
                <option key={String(id)} value={String(id)}>
                  {emp.details?.full_name || `Employee #${id}`}
                </option>
              );
            })}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-[var(--mt-text)]">Timesheet</span>
          <select
            className="mt-focus rounded-xl border border-border bg-[var(--mt-surface)] px-3.5 py-3 disabled:opacity-55"
            value={timesheetId}
            disabled={!employeeId || timesheetsQuery.isLoading}
            onChange={(e) => setTimesheetId(e.target.value)}
          >
            <option value="">
              {timesheetsQuery.isLoading
                ? "Loading timesheets…"
                : "Select timesheet"}
            </option>
            {timesheets.map((ts) => (
              <option key={String(ts.id)} value={String(ts.id)}>
                #{ts.id}
                {ts.period_range
                  ? ` · ${ts.period_range}`
                  : ts.period_start_date
                    ? ` · ${ts.period_start_date} → ${ts.period_end_date}`
                    : ""}
                {ts.status?.name ? ` · ${ts.status.name}` : ""}
              </option>
            ))}
          </select>
        </label>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-[var(--mt-text)]">
            Day rates
          </h2>
          {timesheetId ? (
            <Button
              variant="secondary"
              onClick={() => void rateQuery.refetch()}
            >
              Refresh
            </Button>
          ) : null}
        </div>

        {!employeeId || !timesheetId ? (
          <p className="text-sm text-muted">
            Select an employee and timesheet to load the rate report.
          </p>
        ) : rateQuery.isLoading ? (
          <LoadingState label="Calculating rates…" />
        ) : rateQuery.isError ? (
          <ErrorState
            message={getErrorMessage(rateQuery.error)}
            onRetry={() => void rateQuery.refetch()}
          />
        ) : !rateRows.length ? (
          <p className="text-sm text-muted">No rate rows returned.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Day</th>
                  <th className="px-3 py-2 font-medium">Working</th>
                  <th className="px-3 py-2 font-medium">Travel</th>
                  <th className="px-3 py-2 font-medium">Break</th>
                  <th className="px-3 py-2 font-medium">Rate %</th>
                  <th className="px-3 py-2 font-medium">Original</th>
                  <th className="px-3 py-2 font-medium">Payable</th>
                </tr>
              </thead>
              <tbody>
                {rateRows.map((row) => (
                  <tr
                    key={String(row.date)}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-3 py-2">
                      {row.date || "—"}
                      {row.is_public_holiday ? " · PH" : ""}
                    </td>
                    <td className="px-3 py-2">{row.day_name || "—"}</td>
                    <td className="px-3 py-2">
                      {row.total_working_hours ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      {row.total_travel_hours ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      {row.total_break_hours ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      {row.earning_rate_percent ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      {row.total_original_payout_amount ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      {row.total_payble_amount ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
