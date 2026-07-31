import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  useApproveTimesheet,
  useRejectTimesheet,
  useRevertTimesheet,
  useSubmitTimesheetManagement,
  useTimesheetManagementItem,
} from "@mytask/hooks";
import { ROUTES } from "@mytask/constants";
import { formatTimesheetLabel, getErrorMessage } from "@mytask/utils";
import { Card, PageHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { useToastStore } from "@/store/toastStore";
import { TimesheetDayEditor } from "@/features/timesheet/TimesheetDayEditor";
import {
  RemarksConfirmDialog,
  type TimesheetStatusAction,
} from "@/features/timesheet/RemarksConfirmDialog";

type TimesheetDay = {
  id?: number;
  date?: string;
  day_name?: string;
  total_hours?: number | string;
};

type TimesheetDetail = {
  id?: number;
  code?: string;
  period_range?: string;
  period_start_date?: string;
  period_end_date?: string;
  status?: { name?: string; code?: string };
  job?: { id?: number; name?: string } | null;
  jobs?: Array<{ id?: number; name?: string }> | null;
  days?: TimesheetDay[];
  approval_reason?: string | null;
  reject_reason?: string | null;
  permissions?: {
    can_submit?: boolean;
    can_approve?: boolean;
    can_reject?: boolean;
    can_revert_to_draft?: boolean;
    can_save?: boolean;
  };
  employee?: {
    id?: number;
    details?: { id?: number; full_name?: string };
    user?: { full_name?: string };
  };
};

export function TimesheetManagementDetailPage() {
  const { orgCode = "", id = "" } = useParams();
  const toast = useToastStore();
  const [selectedDayId, setSelectedDayId] = useState<number | null>(null);
  const [pendingAction, setPendingAction] =
    useState<TimesheetStatusAction | null>(null);
  const query = useTimesheetManagementItem(id);
  const submit = useSubmitTimesheetManagement();
  const approve = useApproveTimesheet();
  const reject = useRejectTimesheet();
  const revert = useRevertTimesheet();
  const data = query.data as TimesheetDetail | undefined;

  const employeeName =
    data?.employee?.user?.full_name ||
    data?.employee?.details?.full_name ||
    "Employee";
  const employeeId = data?.employee?.details?.id ?? data?.employee?.id;
  const perms = data?.permissions;

  const canAct = Boolean(
    perms?.can_submit ||
      perms?.can_approve ||
      perms?.can_reject ||
      perms?.can_revert_to_draft,
  );

  const existingRemarks =
    (data?.reject_reason || data?.approval_reason || "").trim() || null;
  const existingRemarksLabel = data?.reject_reason
    ? "Reject remarks"
    : data?.approval_reason
      ? "Approval remarks"
      : "Remarks";

  async function confirmAction(remarks: string) {
    if (!pendingAction) return;
    if (employeeId == null) {
      toast.error("Missing employee", "Employee id required for this action");
      return;
    }
    const action = pendingAction;
    try {
      if (action === "submit") {
        await submit.mutateAsync({ id, employeeId, remarks });
        toast.success("Submitted");
      } else if (action === "approve") {
        await approve.mutateAsync({ id, employeeId, reason: remarks });
        toast.success("Approved");
      } else if (action === "reject") {
        await reject.mutateAsync({ id, employeeId, reason: remarks });
        toast.success("Rejected");
      } else if (action === "revert") {
        await revert.mutateAsync({ id, employeeId, remarks });
        toast.success("Reverted", "Timesheet returned to draft");
      }
      setPendingAction(null);
      void query.refetch();
    } catch (err) {
      toast.error("Action failed", getErrorMessage(err));
    }
  }

  if (query.isLoading) return <LoadingState label="Loading timesheet…" />;
  if (query.isError) {
    return (
      <ErrorState
        message={getErrorMessage(query.error)}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const days = Array.isArray(data?.days) ? data.days : [];
  const busy =
    submit.isPending ||
    approve.isPending ||
    reject.isPending ||
    revert.isPending;

  const jobNames =
    (Array.isArray(data?.jobs) && data.jobs.length
      ? data.jobs.map((j) => j.name).filter(Boolean)
      : data?.job?.name
        ? [data.job.name]
        : []) as string[];

  return (
    <div className="mt-fade-in flex flex-col gap-4">
      <PageHeader
        title={formatTimesheetLabel(
          { code: data?.code, id: data?.id ?? id },
          { prefix: true },
        )}
        description={`${employeeName} · ${data?.period_range || ""}${
          jobNames.length ? ` · ${jobNames.join(", ")}` : ""
        }`}
        actions={
          <Link to={ROUTES.timesheetManagement(orgCode)}>
            <Button variant="secondary">Back</Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-xs font-medium uppercase text-muted">Status</p>
          <p className="mt-1 text-lg font-semibold">
            {data?.status?.name || data?.status?.code || "—"}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase text-muted">Employee</p>
          <p className="mt-1 text-lg font-semibold">{employeeName}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase text-muted">Period</p>
          <p className="mt-1 text-lg font-semibold">
            {data?.period_range || "—"}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase text-muted">Jobs</p>
          <p className="mt-1 text-lg font-semibold">
            {jobNames.length ? jobNames.join(", ") : "—"}
          </p>
        </Card>
      </div>

      {canAct || existingRemarks ? (
        <Card className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">Actions</h2>
          {existingRemarks ? (
            <div>
              <p className="text-xs font-medium uppercase text-muted">
                {existingRemarksLabel}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--mt-text)]">
                {existingRemarks}
              </p>
            </div>
          ) : null}
          {canAct ? (
            <div className="flex flex-wrap gap-2">
              {perms?.can_submit ? (
                <Button
                  loading={busy}
                  disabled={busy}
                  onClick={() => setPendingAction("submit")}
                >
                  Submit for approval
                </Button>
              ) : null}
              {perms?.can_approve ? (
                <Button
                  loading={busy}
                  disabled={busy}
                  onClick={() => setPendingAction("approve")}
                >
                  Approve
                </Button>
              ) : null}
              {perms?.can_reject ? (
                <Button
                  variant="danger"
                  loading={busy}
                  disabled={busy}
                  onClick={() => setPendingAction("reject")}
                >
                  Reject
                </Button>
              ) : null}
              {perms?.can_revert_to_draft ? (
                <Button
                  variant="secondary"
                  loading={busy}
                  disabled={busy}
                  onClick={() => setPendingAction("revert")}
                >
                  Revert to draft
                </Button>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted">
              No status actions are available for this timesheet.
            </p>
          )}
        </Card>
      ) : null}

      <Card>
        <h2 className="mb-3 text-base font-semibold">Days</h2>
        <p className="mb-3 text-xs text-muted">
          Click a day to view or edit tasks.
        </p>
        {!days.length ? (
          <p className="text-sm text-muted">No days loaded for this timesheet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Day</th>
                  <th className="px-3 py-2 font-medium">Hours</th>
                </tr>
              </thead>
              <tbody>
                {days.map((day) => (
                  <tr
                    key={String(day.id ?? day.date)}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-primary-muted/40"
                    onClick={() => day.id != null && setSelectedDayId(day.id)}
                  >
                    <td className="px-3 py-2">{day.date || "—"}</td>
                    <td className="px-3 py-2">{day.day_name || "—"}</td>
                    <td className="px-3 py-2">{day.total_hours ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <TimesheetDayEditor
        mode="management"
        timesheetId={id}
        dayId={selectedDayId}
        employeeId={employeeId}
        open={selectedDayId != null}
        onClose={() => setSelectedDayId(null)}
        onSaved={() => void query.refetch()}
      />

      <RemarksConfirmDialog
        open={pendingAction != null}
        action={pendingAction}
        loading={busy}
        onClose={() => setPendingAction(null)}
        onConfirm={confirmAction}
      />
    </div>
  );
}
