import {
  useCreatePayout,
  useEligiblePayouts,
  useMarkPayoutPaid,
  usePayouts,
} from "@mytask/hooks";
import { can, getOrganisationAcl } from "@mytask/services";
import { getErrorMessage } from "@mytask/utils";
import { Button } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { useOrganisationStore } from "@/store/organisationStore";

type EmployeeLike = {
  id?: number;
  details?: { full_name?: string };
  user?: { full_name?: string };
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

type PayoutRow = {
  id?: number;
  amount?: number | string;
  status?: string;
  payment_method?: string | null;
  paid_at?: string | null;
  notes?: string | null;
  employee?: EmployeeLike;
  timesheet?: TimesheetLike;
};

function employeeName(employee?: EmployeeLike): string {
  return (
    employee?.details?.full_name ||
    employee?.user?.full_name ||
    (employee?.id != null ? `#${employee.id}` : "—")
  );
}

function periodLabel(timesheet?: TimesheetLike): string {
  if (timesheet?.period_range) return timesheet.period_range;
  const start = timesheet?.period_start_date;
  const end = timesheet?.period_end_date;
  if (start && end) return `${start} → ${end}`;
  return timesheet?.code || "—";
}

function formatAmount(value: number | string | undefined): string {
  if (value == null || value === "") return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return num.toFixed(2);
}

export function PayoutsPage() {
  const role = useOrganisationStore((s) => s.organisation?.role);
  const acl = getOrganisationAcl(role);
  const canCreate = can(acl, "payout", "create");
  const canEdit = can(acl, "payout", "edit");

  const payoutsQuery = usePayouts({ rows_per_page: 100, sort_by: "id" });
  const eligibleQuery = useEligiblePayouts();
  const createMutation = useCreatePayout();
  const markPaidMutation = useMarkPayoutPaid();

  const payouts = (Array.isArray(payoutsQuery.data)
    ? payoutsQuery.data
    : []) as PayoutRow[];
  const eligible = (Array.isArray(eligibleQuery.data)
    ? eligibleQuery.data
    : []) as TimesheetLike[];

  const loading = payoutsQuery.isLoading || eligibleQuery.isLoading;
  const error = payoutsQuery.error || eligibleQuery.error;

  if (loading) return <LoadingState />;
  if (error) {
    return <ErrorState message={getErrorMessage(error)} />;
  }

  return (
    <div className="mt-fade-in flex flex-col gap-6">
      <PageHeader
        title="Payouts"
        description="Create payouts from approved timesheets and mark them as paid"
      />

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
                  <th className="px-2 py-2 font-medium">ID</th>
                  <th className="px-2 py-2 font-medium">Employee</th>
                  <th className="px-2 py-2 font-medium">Period</th>
                  <th className="px-2 py-2 font-medium">Code</th>
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
                    <td className="px-2 py-2.5">{row.id}</td>
                    <td className="px-2 py-2.5">
                      {employeeName(row.employee)}
                    </td>
                    <td className="px-2 py-2.5">{periodLabel(row)}</td>
                    <td className="px-2 py-2.5">{row.code || "—"}</td>
                    <td className="px-2 py-2.5">
                      {row.status?.name || row.status?.code || "Approved"}
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      {canCreate ? (
                        <Button
                          variant="soft"
                          className="px-2.5 py-1.5 text-xs"
                          disabled={
                            createMutation.isPending &&
                            createMutation.variables?.timesheet_id === row.id
                          }
                          onClick={() => {
                            if (row.id == null) return;
                            createMutation.mutate({ timesheet_id: row.id });
                          }}
                        >
                          Create payout
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {createMutation.isError ? (
          <p className="mt-3 text-sm text-red-600">
            {getErrorMessage(createMutation.error)}
          </p>
        ) : null}
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-semibold text-[var(--mt-text)]">
          Payouts
        </h2>
        {payouts.length === 0 ? (
          <p className="text-sm text-muted">No payouts yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="px-2 py-2 font-medium">ID</th>
                  <th className="px-2 py-2 font-medium">Employee</th>
                  <th className="px-2 py-2 font-medium">Period</th>
                  <th className="px-2 py-2 font-medium">Amount</th>
                  <th className="px-2 py-2 font-medium">Method</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {payouts.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border/70 text-[var(--mt-text)]"
                  >
                    <td className="px-2 py-2.5">{row.id}</td>
                    <td className="px-2 py-2.5">
                      {employeeName(row.employee)}
                    </td>
                    <td className="px-2 py-2.5">
                      {periodLabel(row.timesheet)}
                    </td>
                    <td className="px-2 py-2.5">{formatAmount(row.amount)}</td>
                    <td className="px-2 py-2.5">
                      {row.payment_method || "—"}
                    </td>
                    <td className="px-2 py-2.5">{row.status || "—"}</td>
                    <td className="px-2 py-2.5 text-right">
                      {canEdit && row.status === "ELIGIBLE" ? (
                        <Button
                          variant="soft"
                          className="px-2.5 py-1.5 text-xs"
                          disabled={
                            markPaidMutation.isPending &&
                            markPaidMutation.variables === row.id
                          }
                          onClick={() => {
                            if (row.id == null) return;
                            markPaidMutation.mutate(row.id);
                          }}
                        >
                          Mark paid
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {markPaidMutation.isError ? (
          <p className="mt-3 text-sm text-red-600">
            {getErrorMessage(markPaidMutation.error)}
          </p>
        ) : null}
      </Card>
    </div>
  );
}
