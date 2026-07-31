import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { reportsApi } from "@mytask/api";
import { formatHours, formatMoney } from "@mytask/constants";
import { can, getOrganisationAcl } from "@mytask/services";
import { formatDisplayTime, formatTimesheetLabel, getErrorMessage } from "@mytask/utils";
import { useOrganisationStore } from "@/store/organisationStore";
import { useToastStore } from "@/store/toastStore";
import { Card, PageHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/States";

type EmpOption = {
  id: number;
  full_name?: string;
  email?: string | null;
  role?: { code?: string; name?: string } | null;
  is_you?: boolean;
};

type TsOption = {
  id: number;
  code?: string;
  employee_id?: number;
  period_range?: string;
  period_start_date?: string;
  period_end_date?: string;
  status?: { name?: string; code?: string };
  jobs?: Array<{ id: number; name?: string }>;
};

type DayRow = {
  date?: string;
  day_name?: string | null;
  clock_in?: string | null;
  clock_out?: string | null;
  working_hours?: number;
  break_hours?: number;
  travel_hours?: number;
  overtime_hours?: number;
  amount?: number;
  notes?: string | null;
  is_public_holiday?: boolean;
};

type ReportResult = {
  currency?: string;
  employee?: {
    employee_id?: number;
    name?: string;
    email?: string | null;
    code?: string;
  };
  timesheet?: {
    timesheet_id?: number;
    code?: string;
    period_start_date?: string;
    period_end_date?: string;
    period?: string | { start?: string; end?: string };
    jobs?: Array<{ id: number; name?: string }>;
    status?: { name?: string; code?: string };
  };
  days?: DayRow[];
  totals?: {
    working_hours?: number;
    break_hours?: number;
    travel_hours?: number;
    overtime_hours?: number;
    days_worked?: number;
    amount?: number;
  };
  pay_cycle?: {
    total_amount?: number;
    currency?: string;
    is_paid?: boolean;
    paid_label?: string;
    payout_status?: string | null;
    paid_at?: string | null;
  };
};

type ReportRequest = {
  id: number;
  name?: string;
  status?: string;
  progress?: number | null;
  error_message?: string | null;
  created_at?: string;
  completed_at?: string | null;
  result?: ReportResult | null;
};

function StatusBadge({ status }: { status?: string }) {
  const tone =
    status === "completed"
      ? "bg-primary/15 text-primary"
      : status === "failed"
        ? "bg-negative/15 text-negative"
        : "bg-muted/20 text-muted";
  return (
    <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${tone}`}>
      {status || "—"}
    </span>
  );
}

async function triggerPdfDownload(id: string | number) {
  const res = await reportsApi.downloadPdf(id);
  const blob = res.data as Blob;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `report-${id}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function ReportsPage() {
  const toast = useToastStore();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const role = useOrganisationStore((s) => s.organisation?.role);
  const acl = getOrganisationAcl(role);
  const canCreate = can(acl, "report", "create");
  const roleCode =
    role && typeof role === "object" && "code" in role
      ? String((role as { code?: string }).code || "")
      : String(role || "");
  const isStaff = roleCode === "staff";

  const [employeeId, setEmployeeId] = useState("");
  const [timesheetId, setTimesheetId] = useState("");
  const [activeRequestId, setActiveRequestId] = useState<string | null>(
    searchParams.get("request"),
  );

  const employeesQuery = useQuery({
    queryKey: ["reports", "employees"],
    queryFn: async () => {
      const res = await reportsApi.listEmployees();
      return (res.data as { data: EmpOption[] }).data;
    },
  });

  const employees = employeesQuery.data || [];

  useEffect(() => {
    if (isStaff && employees.length === 1 && !employeeId) {
      setEmployeeId(String(employees[0].id));
    }
  }, [isStaff, employees, employeeId]);

  const timesheetsQuery = useQuery({
    queryKey: ["reports", "timesheets", employeeId] as const,
    queryFn: async () => {
      const res = await reportsApi.listTimesheets({
        employee_id: employeeId,
        rows_per_page: 200,
      });
      return (res.data as { data: TsOption[] }).data;
    },
    enabled: Boolean(employeeId),
  });

  const approvedTimesheets = timesheetsQuery.data || [];

  const REQUESTS_PAGE_SIZE = 5;
  const [requestsPage, setRequestsPage] = useState(1);
  const [requestItems, setRequestItems] = useState<ReportRequest[]>([]);
  const [requestsHasMore, setRequestsHasMore] = useState(false);

  const historyQuery = useQuery({
    queryKey: ["reports", "requests", requestsPage, REQUESTS_PAGE_SIZE] as const,
    queryFn: async () => {
      const res = await reportsApi.listRequests({
        rows_per_page: REQUESTS_PAGE_SIZE,
        page_number: requestsPage,
      });
      const body = res.data as {
        data?: ReportRequest[];
        pagination?: {
          total_rows?: number;
          has_more?: boolean;
          page_number?: number;
          total_pages?: number;
        };
        info?: {
          pagination?: {
            total_rows?: number;
            has_more?: boolean;
            page_number?: number;
            total_pages?: number;
          } | null;
        };
      };
      // Backend middleware moves pagination onto info.pagination
      const pagination = body.pagination || body.info?.pagination || undefined;
      const rows = Array.isArray(body.data) ? body.data : [];
      return { data: rows, pagination };
    },
  });

  useEffect(() => {
    const payload = historyQuery.data;
    if (!payload) return;
    const pageRows = Array.isArray(payload.data) ? payload.data : [];
    setRequestItems((prev) => {
      if (requestsPage <= 1) return pageRows;
      const seen = new Set(prev.map((r) => r.id));
      const next = pageRows.filter((r) => !seen.has(r.id));
      return next.length ? [...prev, ...next] : prev;
    });
    const hasMore =
      Boolean(payload.pagination?.has_more) ||
      (payload.pagination?.total_rows != null
        ? requestsPage * REQUESTS_PAGE_SIZE <
          Number(payload.pagination.total_rows)
        : pageRows.length >= REQUESTS_PAGE_SIZE);
    setRequestsHasMore(hasMore);
  }, [historyQuery.data, requestsPage]);

  const activeStatus = useQuery({
    queryKey: ["reports", "request", activeRequestId],
    queryFn: async () => {
      const res = await reportsApi.getRequest(activeRequestId!);
      return (res.data as { data: ReportRequest }).data;
    },
    enabled: Boolean(activeRequestId),
    refetchInterval: (q) => {
      const st = q.state.data?.status;
      if (!st || ["completed", "failed"].includes(st)) return false;
      return 2000;
    },
  });

  const resultQuery = useQuery({
    queryKey: ["reports", "result", activeRequestId],
    queryFn: async () => {
      const res = await reportsApi.getResult(activeRequestId!);
      return (res.data as { data: ReportRequest }).data;
    },
    enabled:
      Boolean(activeRequestId) && activeStatus.data?.status === "completed",
  });

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      reportsApi.createRequest(payload),
    onSuccess: async (res) => {
      const data = (res.data as { data: ReportRequest }).data;
      setActiveRequestId(String(data.id));
      setSearchParams({ request: String(data.id) });
      toast.success("Report queued", "Generating in the background…");
      setRequestsPage(1);
      void qc.invalidateQueries({ queryKey: ["reports", "requests"] });
    },
    onError: (err) => toast.error("Generate failed", getErrorMessage(err)),
  });

  const emailMutation = useMutation({
    mutationFn: () => reportsApi.emailPdf(activeRequestId!),
    onSuccess: (res) => {
      const msg =
        (res.data as { message?: string })?.message ||
        "Report and PDF emailed successfully";
      toast.success("Email sent", msg);
    },
    onError: (err) => toast.error("Email failed", getErrorMessage(err)),
  });

  const downloadMutation = useMutation({
    mutationFn: () => triggerPdfDownload(activeRequestId!),
    onSuccess: () => toast.success("Download started", "PDF downloading…"),
    onError: (err) => toast.error("Download failed", getErrorMessage(err)),
  });

  const result = resultQuery.data?.result;
  const processing =
    activeStatus.data &&
    !["completed", "failed"].includes(activeStatus.data.status || "");

  function handleGenerate() {
    if (!canCreate) {
      toast.warning("You do not have permission to generate reports");
      return;
    }
    if (!employeeId) {
      toast.warning("Select an employee");
      return;
    }
    if (!timesheetId) {
      toast.warning("Select an approved timesheet");
      return;
    }
    createMutation.mutate({
      employee_id: Number(employeeId),
      timesheet_id: Number(timesheetId),
    });
  }

  return (
    <div className="mt-fade-in flex flex-col gap-4">
      <PageHeader
        title="Reports"
        description="Generate a pay report for one approved timesheet, then download or email the PDF"
      />

      <Card className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-[var(--mt-text)]">
          Generate report
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Employee</span>
            <select
              className="rounded-xl border border-border bg-[var(--mt-surface)] px-3 py-2.5"
              value={employeeId}
              onChange={(e) => {
                setEmployeeId(e.target.value);
                setTimesheetId("");
              }}
              disabled={isStaff && employees.length === 1}
            >
              <option value="">Select employee</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name || `Employee #${emp.id}`}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Approved timesheet</span>
            <select
              className="rounded-xl border border-border bg-[var(--mt-surface)] px-3 py-2.5 disabled:opacity-55"
              value={timesheetId}
              disabled={!employeeId || timesheetsQuery.isLoading}
              onChange={(e) => setTimesheetId(e.target.value)}
            >
              <option value="">Select timesheet</option>
              {approvedTimesheets.map((ts) => (
                <option key={ts.id} value={ts.id}>
                  {formatTimesheetLabel({ code: ts.code, id: ts.id })}
                  {ts.period_range ? ` · ${ts.period_range}` : ""}
                  {ts.jobs?.length
                    ? ` · ${ts.jobs.map((j) => j.name).filter(Boolean).join(", ")}`
                    : ""}
                </option>
              ))}
            </select>
          </label>
        </div>

        {employeeId &&
        !timesheetsQuery.isLoading &&
        !approvedTimesheets.length ? (
          <p className="rounded-xl border border-border bg-muted/10 px-3 py-2 text-sm text-muted">
            No approved timesheets for this employee. Only approved timesheets
            can generate a report.
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            loading={createMutation.isPending}
            disabled={!canCreate || !employeeId || !timesheetId}
            onClick={() => handleGenerate()}
          >
            Generate report
          </Button>
          {activeStatus.data ? (
            <div className="flex items-center gap-2 text-sm text-muted">
              <StatusBadge status={activeStatus.data.status} />
              {activeStatus.data.progress != null
                ? `${activeStatus.data.progress}%`
                : null}
            </div>
          ) : null}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="flex flex-col gap-4">
          {activeStatus.data?.status === "failed" ? (
            <ErrorState
              message={
                activeStatus.data.error_message || "Report generation failed"
              }
            />
          ) : null}

          {processing ? (
            <LoadingState label="Generating report in the background…" />
          ) : null}

          {resultQuery.isLoading ? (
            <LoadingState label="Loading report result…" />
          ) : null}

          {result ? (
            <>
              <Card className="flex flex-col gap-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-[var(--mt-text)]">
                      {result.employee?.name || "Employee"}
                    </p>
                    <p className="text-sm text-muted">
                      {formatTimesheetLabel(
                        {
                          code: result.timesheet?.code,
                          id: result.timesheet?.timesheet_id,
                        },
                        { prefix: true },
                      )}
                      {result.timesheet?.period_start_date
                        ? ` · ${result.timesheet.period_start_date} → ${result.timesheet.period_end_date}`
                        : ""}
                      {result.timesheet?.jobs?.length
                        ? ` · ${result.timesheet.jobs
                            .map((j) => j.name)
                            .filter(Boolean)
                            .join(", ")}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      loading={downloadMutation.isPending}
                      onClick={() => downloadMutation.mutate()}
                    >
                      Download PDF
                    </Button>
                    <Button
                      variant="secondary"
                      loading={emailMutation.isPending}
                      onClick={() => emailMutation.mutate()}
                    >
                      Email Report
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="rounded-xl border border-border px-3 py-2">
                    <p className="text-xs uppercase tracking-wide text-muted">
                      Working
                    </p>
                    <p className="mt-1 text-xl font-semibold">
                      {formatHours(result.totals?.working_hours ?? 0)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border px-3 py-2">
                    <p className="text-xs uppercase tracking-wide text-muted">
                      Break
                    </p>
                    <p className="mt-1 text-xl font-semibold">
                      {formatHours(result.totals?.break_hours ?? 0)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border px-3 py-2">
                    <p className="text-xs uppercase tracking-wide text-muted">
                      Travel
                    </p>
                    <p className="mt-1 text-xl font-semibold">
                      {formatHours(result.totals?.travel_hours ?? 0)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border px-3 py-2">
                    <p className="text-xs uppercase tracking-wide text-muted">
                      Pay cycle total
                    </p>
                    <p className="mt-1 text-xl font-semibold text-primary">
                      {formatMoney(
                        result.pay_cycle?.total_amount,
                        result.currency || result.pay_cycle?.currency,
                      )}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border px-3 py-2">
                    <p className="text-xs uppercase tracking-wide text-muted">
                      Payment
                    </p>
                    <p
                      className={`mt-1 text-xl font-semibold ${
                        result.pay_cycle?.is_paid
                          ? "text-positive"
                          : "text-[var(--mt-text)]"
                      }`}
                    >
                      {result.pay_cycle?.paid_label ||
                        (result.pay_cycle?.is_paid ? "Paid" : "Not paid")}
                    </p>
                  </div>
                </div>
              </Card>

              <Card>
                <h3 className="mb-3 text-base font-semibold">Daily breakdown</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-border text-muted">
                      <tr>
                        <th className="px-2 py-1.5 font-medium">Day</th>
                        <th className="px-2 py-1.5 font-medium">In</th>
                        <th className="px-2 py-1.5 font-medium">Out</th>
                        <th className="px-2 py-1.5 font-medium">Work</th>
                        <th className="px-2 py-1.5 font-medium">Break</th>
                        <th className="px-2 py-1.5 font-medium">Travel</th>
                        <th className="px-2 py-1.5 font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(result.days || []).map((d) => (
                        <tr
                          key={String(d.date)}
                          className="border-b border-border last:border-0"
                        >
                          <td className="px-2 py-1.5">
                            {d.date}
                            {d.day_name ? ` · ${d.day_name}` : ""}
                            {d.is_public_holiday ? " · PH" : ""}
                          </td>
                          <td className="px-2 py-1.5">
                            {formatDisplayTime(d.clock_in)}
                          </td>
                          <td className="px-2 py-1.5">
                            {formatDisplayTime(d.clock_out)}
                          </td>
                          <td className="px-2 py-1.5">
                            {formatHours(d.working_hours ?? 0)}
                          </td>
                          <td className="px-2 py-1.5">
                            {formatHours(d.break_hours ?? 0)}
                          </td>
                          <td className="px-2 py-1.5">
                            {formatHours(d.travel_hours ?? 0)}
                          </td>
                          <td className="px-2 py-1.5">
                            {formatMoney(
                              d.amount,
                              result.currency || result.pay_cycle?.currency,
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-border font-semibold">
                        <td className="px-2 py-2" colSpan={6}>
                          Pay cycle total
                        </td>
                        <td className="px-2 py-2">
                          {formatMoney(
                            result.pay_cycle?.total_amount,
                            result.currency || result.pay_cycle?.currency,
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-2 py-2 text-muted" colSpan={6}>
                          Payment status
                        </td>
                        <td className="px-2 py-2">
                          {result.pay_cycle?.paid_label ||
                            (result.pay_cycle?.is_paid ? "Paid" : "Not paid")}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </Card>
            </>
          ) : activeRequestId &&
            activeStatus.data?.status === "completed" &&
            !resultQuery.isLoading ? (
            <Card>
              <p className="text-sm text-muted">
                Report completed but no result payload was returned.
              </p>
            </Card>
          ) : !activeRequestId ? (
            <Card>
              <p className="text-sm text-muted">
                Select one employee and an approved timesheet, then generate the
                report.
              </p>
            </Card>
          ) : null}
        </div>

        <Card className="h-fit">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Recent requests
          </h3>
          {historyQuery.isLoading && requestItems.length === 0 ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : !requestItems.length ? (
            <p className="text-sm text-muted">No requests yet</p>
          ) : (
            <>
              <ul className="flex flex-col gap-2">
                {requestItems.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition hover:border-primary ${
                        String(activeRequestId) === String(r.id)
                          ? "border-primary bg-primary-muted/30"
                          : "border-border"
                      }`}
                      onClick={() => {
                        setActiveRequestId(String(r.id));
                        setSearchParams({ request: String(r.id) });
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-[var(--mt-text)]">
                          #{r.id}
                        </span>
                        <StatusBadge status={r.status} />
                      </div>
                      <p className="mt-1 truncate text-xs text-muted">
                        {r.name || "Report"}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
              {requestsHasMore ? (
                <Button
                  variant="secondary"
                  className="mt-3 w-full"
                  loading={historyQuery.isFetching}
                  onClick={() => setRequestsPage((p) => p + 1)}
                >
                  Load more
                </Button>
              ) : null}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
