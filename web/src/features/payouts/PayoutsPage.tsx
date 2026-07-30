import { useMemo, useState } from "react";
import {
  useApprovePayout,
  useCancelPayout,
  useCreatePayout,
  useEligiblePayouts,
  useExportPayouts,
  useMarkPayoutPaid,
  usePayout,
  usePayouts,
  useReleasePayout,
  useSubmitPayout,
} from "@mytask/hooks";
import { DEFAULT_LIST_PAGE_SIZE, formatMoney } from "@mytask/constants";
import { can, getOrganisationAcl } from "@mytask/services";
import { getErrorMessage, listPagination, listRows } from "@mytask/utils";
import { Button } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { useOrganisationStore } from "@/store/organisationStore";
import { useToastStore } from "@/store/toastStore";

type EmployeeLike = {
  id?: number;
  details?: { full_name?: string };
  user?: { full_name?: string };
  wage?: { currency?: string };
};

type TimesheetLike = {
  id?: number;
  code?: string;
  period_range?: string;
  period_start_date?: string;
  period_end_date?: string;
  employee?: EmployeeLike;
  status?: { name?: string; code?: string };
};

type PayoutEvent = {
  id?: number;
  action?: string;
  previous_status?: string | null;
  new_status?: string | null;
  notes?: string | null;
  created_at?: string;
};

type PayoutRow = {
  id?: number;
  payout_number?: string | null;
  amount?: number | string;
  net_amount?: number | string | null;
  gross_amount?: number | string | null;
  deductions?: number | string | null;
  bonuses?: number | string | null;
  adjustments?: number | string | null;
  tax_amount?: number | string | null;
  worked_hours?: number | string | null;
  regular_hours?: number | string | null;
  overtime_hours?: number | string | null;
  hourly_rate?: number | string | null;
  currency?: string | null;
  status?: string;
  payment_method?: string | null;
  pay_date?: string | null;
  paid_at?: string | null;
  notes?: string | null;
  period_start_date?: string | null;
  period_end_date?: string | null;
  employee?: EmployeeLike;
  timesheet?: TimesheetLike;
  events?: PayoutEvent[];
};

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING_APPROVAL", label: "Pending approval" },
  { value: "APPROVED", label: "Approved" },
  { value: "READY_FOR_PAYOUT", label: "Ready for payout" },
  { value: "PAID", label: "Paid" },
  { value: "CANCELLED", label: "Cancelled" },
];

const RANGE_PRESETS = [
  { value: "all", label: "All time" },
  { value: "current_month", label: "Current month" },
  { value: "last_month", label: "Last month" },
  { value: "last_3_months", label: "Last 3 months" },
  { value: "year", label: "This year" },
  { value: "custom", label: "Custom dates" },
];

function employeeName(employee?: EmployeeLike): string {
  return (
    employee?.details?.full_name ||
    employee?.user?.full_name ||
    (employee?.id != null ? `#${employee.id}` : "—")
  );
}

function periodLabel(row?: PayoutRow | TimesheetLike): string {
  const start =
    (row as PayoutRow)?.period_start_date ||
    (row as TimesheetLike)?.period_start_date;
  const end =
    (row as PayoutRow)?.period_end_date ||
    (row as TimesheetLike)?.period_end_date;
  if (start && end) return `${start} → ${end}`;
  const ts = (row as PayoutRow)?.timesheet;
  if (ts?.period_range) return ts.period_range;
  if (ts?.period_start_date && ts?.period_end_date) {
    return `${ts.period_start_date} → ${ts.period_end_date}`;
  }
  return ts?.code || "—";
}

function formatAmount(
  value: number | string | null | undefined,
  currency?: string | null,
): string {
  return formatMoney(value, currency);
}

function normalizeStatus(status?: string | null): string {
  if (!status) return "";
  if (status === "ELIGIBLE") return "READY_FOR_PAYOUT";
  if (status === "VOID") return "CANCELLED";
  return status;
}

function statusLabel(status?: string | null): string {
  const s = normalizeStatus(status);
  return (
    STATUS_OPTIONS.find((o) => o.value === s)?.label || status || "—"
  );
}

function statusBadgeClass(status?: string | null): string {
  const s = normalizeStatus(status);
  switch (s) {
    case "PAID":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
    case "READY_FOR_PAYOUT":
    case "APPROVED":
      return "bg-primary-muted text-primary";
    case "PENDING_APPROVAL":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
    case "DRAFT":
      return "bg-slate-500/15 text-slate-600 dark:text-slate-300";
    case "CANCELLED":
      return "bg-rose-500/15 text-rose-700 dark:text-rose-300";
    default:
      return "bg-slate-500/10 text-muted";
  }
}

function rangeToDates(preset: string, customFrom: string, customTo: string) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const pad = (n: number) => String(n).padStart(2, "0");
  const iso = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (preset === "current_month") {
    return {
      from: iso(new Date(y, m, 1)),
      to: iso(new Date(y, m + 1, 0)),
    };
  }
  if (preset === "last_month") {
    return {
      from: iso(new Date(y, m - 1, 1)),
      to: iso(new Date(y, m, 0)),
    };
  }
  if (preset === "last_3_months") {
    return {
      from: iso(new Date(y, m - 2, 1)),
      to: iso(new Date(y, m + 1, 0)),
    };
  }
  if (preset === "year") {
    return { from: `${y}-01-01`, to: `${y}-12-31` };
  }
  if (preset === "custom") {
    return { from: customFrom || undefined, to: customTo || undefined };
  }
  return { from: undefined, to: undefined };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function PayoutsPage() {
  const toast = useToastStore();
  const role = useOrganisationStore((s) => s.organisation?.role);
  const acl = getOrganisationAcl(role);
  const canCreate = can(acl, "payout", "create");
  const canEdit = can(acl, "payout", "edit");
  const canList = can(acl, "payout", "list");

  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [range, setRange] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  const dateRange = useMemo(
    () => rangeToDates(range, customFrom, customTo),
    [range, customFrom, customTo],
  );

  const listParams = useMemo(
    () => ({
      rows_per_page: DEFAULT_LIST_PAGE_SIZE,
      page_number: page,
      sort_by: "id",
      status: status || undefined,
      search: search || undefined,
      from: dateRange.from,
      to: dateRange.to,
    }),
    [status, search, dateRange, page],
  );

  const payoutsQuery = usePayouts(listParams, canList);
  const eligibleQuery = useEligiblePayouts(canCreate);
  const detailQuery = usePayout(selectedId, Boolean(selectedId));
  const createMutation = useCreatePayout();
  const submitMutation = useSubmitPayout();
  const approveMutation = useApprovePayout();
  const releaseMutation = useReleasePayout();
  const markPaidMutation = useMarkPayoutPaid();
  const cancelMutation = useCancelPayout();
  const exportMutation = useExportPayouts();

  const payouts = listRows<PayoutRow>(payoutsQuery.data);
  const payoutPagination = listPagination(payoutsQuery.data);
  const totalPages = Math.max(1, Number(payoutPagination?.total_pages) || 1);
  const totalRows = Number(payoutPagination?.total_rows) || payouts.length;
  const currentPage = Number(payoutPagination?.page_number) || page;
  const eligible = (Array.isArray(eligibleQuery.data)
    ? eligibleQuery.data
    : []) as TimesheetLike[];
  const selected = (detailQuery.data || null) as PayoutRow | null;

  const loading =
    payoutsQuery.isLoading || (canCreate && eligibleQuery.isLoading);
  const error = payoutsQuery.error || eligibleQuery.error;

  const runAction = async (
    label: string,
    fn: () => Promise<unknown>,
  ) => {
    try {
      await fn();
      toast.success(label);
      void detailQuery.refetch();
    } catch (err) {
      toast.error(label, getErrorMessage(err));
    }
  };

  const actionsFor = (row: PayoutRow) => {
    if (!canEdit || row.id == null) return null;
    const s = normalizeStatus(row.status);
    const id = row.id;
    return (
      <div className="flex flex-wrap justify-end gap-1.5">
        {s === "DRAFT" ? (
          <Button
            variant="soft"
            className="px-2.5 py-1.5 text-xs"
            disabled={submitMutation.isPending}
            onClick={() =>
              void runAction("Submitted for approval", () =>
                submitMutation.mutateAsync({ id }),
              )
            }
          >
            Submit
          </Button>
        ) : null}
        {s === "PENDING_APPROVAL" ? (
          <Button
            variant="soft"
            className="px-2.5 py-1.5 text-xs"
            disabled={approveMutation.isPending}
            onClick={() =>
              void runAction("Payout approved", () =>
                approveMutation.mutateAsync({ id }),
              )
            }
          >
            Approve
          </Button>
        ) : null}
        {s === "APPROVED" ? (
          <Button
            variant="soft"
            className="px-2.5 py-1.5 text-xs"
            disabled={releaseMutation.isPending}
            onClick={() =>
              void runAction("Ready for payout", () =>
                releaseMutation.mutateAsync({ id }),
              )
            }
          >
            Release
          </Button>
        ) : null}
        {s === "READY_FOR_PAYOUT" || s === "ELIGIBLE" ? (
          <Button
            variant="soft"
            className="px-2.5 py-1.5 text-xs"
            disabled={markPaidMutation.isPending}
            onClick={() =>
              void runAction("Marked as paid", () =>
                markPaidMutation.mutateAsync({ id }),
              )
            }
          >
            Mark paid
          </Button>
        ) : null}
        {s !== "PAID" && s !== "CANCELLED" ? (
          <Button
            variant="ghost"
            className="px-2.5 py-1.5 text-xs text-rose-600"
            disabled={cancelMutation.isPending}
            onClick={() =>
              void runAction("Payout cancelled", () =>
                cancelMutation.mutateAsync({ id }),
              )
            }
          >
            Cancel
          </Button>
        ) : null}
      </div>
    );
  };

  if (!canList) {
    return (
      <ErrorState message="You do not have permission to view payouts." />
    );
  }

  if (loading) return <LoadingState />;
  if (error) {
    return <ErrorState message={getErrorMessage(error)} />;
  }

  return (
    <div className="mt-fade-in flex flex-col gap-6">
      <PageHeader
        title="Payouts"
        description="Internal payroll records generated from approved timesheets"
      />

      {canCreate ? (
        <Card>
          <h2 className="mb-3 text-lg font-semibold text-[var(--mt-text)]">
            Eligible timesheets
          </h2>
          {eligible.length === 0 ? (
            <p className="text-sm text-muted">
              No approved timesheets waiting for payout
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-muted">
                    <th className="px-2 py-2 font-medium">Code</th>
                    <th className="px-2 py-2 font-medium">Employee</th>
                    <th className="px-2 py-2 font-medium">Period</th>
                    <th className="px-2 py-2 font-medium">Status</th>
                    <th className="px-2 py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {eligible.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-border/70 text-[var(--mt-text)]"
                    >
                      <td className="px-2 py-2.5">{row.code || "—"}</td>
                      <td className="px-2 py-2.5">
                        {employeeName(row.employee)}
                      </td>
                      <td className="px-2 py-2.5">{periodLabel(row)}</td>
                      <td className="px-2 py-2.5">
                        {row.status?.name || row.status?.code || "Approved"}
                      </td>
                      <td className="px-2 py-2.5 text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            className="px-2.5 py-1.5 text-xs"
                            disabled={createMutation.isPending}
                            onClick={() => {
                              if (row.id == null) return;
                              void runAction("Draft payout created", () =>
                                createMutation.mutateAsync({
                                  timesheet_id: row.id!,
                                  as_draft: true,
                                }),
                              );
                            }}
                          >
                            Save draft
                          </Button>
                          <Button
                            variant="soft"
                            className="px-2.5 py-1.5 text-xs"
                            disabled={createMutation.isPending}
                            onClick={() => {
                              if (row.id == null) return;
                              void runAction("Payout created", () =>
                                createMutation.mutateAsync({
                                  timesheet_id: row.id!,
                                }),
                              );
                            }}
                          >
                            Create payout
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : null}

      <Card>
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--mt-text)]">
              Payout history
            </h2>
            <p className="text-xs text-muted">
              Filter, search, and manage payroll records
            </p>
          </div>
          <Button
            variant="soft"
            className="self-start px-3 py-2 text-sm"
            disabled={exportMutation.isPending}
            onClick={() => {
              void exportMutation
                .mutateAsync(listParams)
                .then((blob) =>
                  downloadBlob(blob, `payouts-${Date.now()}.csv`),
                )
                .then(() => toast.success("Export downloaded"))
                .catch((err) =>
                  toast.error("Export failed", getErrorMessage(err)),
                );
            }}
          >
            Export CSV
          </Button>
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs text-muted">
            Status
            <select
              className="rounded-lg border border-border bg-[var(--mt-bg)] px-3 py-2 text-sm text-[var(--mt-text)]"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            Date range
            <select
              className="rounded-lg border border-border bg-[var(--mt-bg)] px-3 py-2 text-sm text-[var(--mt-text)]"
              value={range}
              onChange={(e) => {
                setRange(e.target.value);
                setPage(1);
              }}
            >
              {RANGE_PRESETS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted sm:col-span-2">
            Search
            <div className="flex gap-2">
              <input
                className="min-w-0 flex-1 rounded-lg border border-border bg-[var(--mt-bg)] px-3 py-2 text-sm text-[var(--mt-text)]"
                placeholder="Employee, payout #, timesheet code"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setSearch(searchInput.trim());
                    setPage(1);
                  }
                }}
              />
              <Button
                variant="soft"
                className="px-3 py-2 text-sm"
                onClick={() => {
                  setSearch(searchInput.trim());
                  setPage(1);
                }}
              >
                Search
              </Button>
            </div>
          </label>
          {range === "custom" ? (
            <>
              <label className="flex flex-col gap-1 text-xs text-muted">
                From
                <input
                  type="date"
                  className="rounded-lg border border-border bg-[var(--mt-bg)] px-3 py-2 text-sm text-[var(--mt-text)]"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted">
                To
                <input
                  type="date"
                  className="rounded-lg border border-border bg-[var(--mt-bg)] px-3 py-2 text-sm text-[var(--mt-text)]"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                />
              </label>
            </>
          ) : null}
        </div>

        {payouts.length === 0 ? (
          <p className="text-sm text-muted">No payouts match these filters</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="px-2 py-2 font-medium">Payout #</th>
                  <th className="px-2 py-2 font-medium">Employee</th>
                  <th className="px-2 py-2 font-medium">Period</th>
                  <th className="px-2 py-2 font-medium">Hours</th>
                  <th className="px-2 py-2 font-medium">Net</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {payouts.map((row) => {
                  const currency =
                    row.currency || row.employee?.wage?.currency;
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-border/70 text-[var(--mt-text)]"
                    >
                      <td className="px-2 py-2.5">
                        <button
                          type="button"
                          className="font-medium text-primary hover:underline"
                          onClick={() => setSelectedId(row.id ?? null)}
                        >
                          {row.payout_number || `#${row.id}`}
                        </button>
                        <div className="text-xs text-muted">
                          {row.timesheet?.code || "—"}
                        </div>
                      </td>
                      <td className="px-2 py-2.5">
                        {employeeName(row.employee)}
                      </td>
                      <td className="px-2 py-2.5">{periodLabel(row)}</td>
                      <td className="px-2 py-2.5">
                        {row.worked_hours != null
                          ? `${Number(row.worked_hours).toFixed(2)}h`
                          : "—"}
                      </td>
                      <td className="px-2 py-2.5">
                        {formatAmount(row.net_amount ?? row.amount, currency)}
                      </td>
                      <td className="px-2 py-2.5">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(row.status)}`}
                        >
                          {statusLabel(row.status)}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-right">
                        {actionsFor(row)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {payouts.length > 0 || totalRows > 0 ? (
          <div className="mt-4 flex items-center justify-between gap-3 text-sm text-muted">
            <span>
              {totalRows} total · page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={currentPage <= 1 || payoutsQuery.isFetching}
                onClick={() => setPage(Math.max(1, currentPage - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={currentPage >= totalPages || payoutsQuery.isFetching}
                onClick={() =>
                  setPage(Math.min(totalPages, currentPage + 1))
                }
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      {selectedId != null ? (
        <Card>
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[var(--mt-text)]">
                Payout detail
              </h2>
              <p className="text-xs text-muted">
                Snapshot amounts, hours, and audit trail
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="px-3 py-1.5 text-xs"
                onClick={() => window.print()}
              >
                Print
              </Button>
              <Button
                variant="ghost"
                className="px-3 py-1.5 text-xs"
                onClick={() => setSelectedId(null)}
              >
                Close
              </Button>
            </div>
          </div>

          {detailQuery.isLoading ? (
            <LoadingState label="Loading payout…" />
          ) : detailQuery.isError ? (
            <ErrorState message={getErrorMessage(detailQuery.error)} />
          ) : selected ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2 text-sm text-[var(--mt-text)]">
                <DetailRow
                  label="Payout #"
                  value={selected.payout_number || `#${selected.id}`}
                />
                <DetailRow
                  label="Employee"
                  value={employeeName(selected.employee)}
                />
                <DetailRow label="Period" value={periodLabel(selected)} />
                <DetailRow
                  label="Status"
                  value={statusLabel(selected.status)}
                />
                <DetailRow
                  label="Pay date"
                  value={selected.pay_date || selected.paid_at || "—"}
                />
                <DetailRow
                  label="Worked / OT"
                  value={`${selected.worked_hours ?? "—"}h / ${selected.overtime_hours ?? "—"}h`}
                />
                <DetailRow
                  label="Hourly rate"
                  value={formatAmount(
                    selected.hourly_rate,
                    selected.currency || selected.employee?.wage?.currency,
                  )}
                />
                <DetailRow
                  label="Gross"
                  value={formatAmount(
                    selected.gross_amount,
                    selected.currency || selected.employee?.wage?.currency,
                  )}
                />
                <DetailRow
                  label="Deductions / Bonuses / Adj / Tax"
                  value={`${formatAmount(selected.deductions, selected.currency)} / ${formatAmount(selected.bonuses, selected.currency)} / ${formatAmount(selected.adjustments, selected.currency)} / ${formatAmount(selected.tax_amount, selected.currency)}`}
                />
                <DetailRow
                  label="Net"
                  value={formatAmount(
                    selected.net_amount ?? selected.amount,
                    selected.currency || selected.employee?.wage?.currency,
                  )}
                />
                <DetailRow label="Notes" value={selected.notes || "—"} />
                <div className="pt-2">{actionsFor(selected)}</div>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold text-[var(--mt-text)]">
                  Audit trail
                </h3>
                {(selected.events || []).length === 0 ? (
                  <p className="text-sm text-muted">No events recorded yet</p>
                ) : (
                  <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
                    {(selected.events || []).map((ev) => (
                      <li
                        key={ev.id}
                        className="rounded-xl border border-border px-3 py-2 text-sm"
                      >
                        <div className="font-medium text-[var(--mt-text)]">
                          {ev.action}
                          {ev.previous_status || ev.new_status
                            ? ` · ${ev.previous_status || "—"} → ${ev.new_status || "—"}`
                            : null}
                        </div>
                        <div className="text-xs text-muted">
                          {ev.created_at || ""}
                          {ev.notes ? ` · ${ev.notes}` : ""}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 border-b border-border/60 py-1.5">
      <dt className="w-40 shrink-0 text-xs uppercase tracking-wide text-muted">
        {label}
      </dt>
      <dd className="min-w-0 flex-1">{value}</dd>
    </div>
  );
}
