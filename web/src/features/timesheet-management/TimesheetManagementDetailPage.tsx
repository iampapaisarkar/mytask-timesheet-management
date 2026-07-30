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
import { getErrorMessage } from "@mytask/utils";
import { Card, PageHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { useToastStore } from "@/store/toastStore";
import { TimesheetDayEditor } from "@/features/timesheet/TimesheetDayEditor";

type TimesheetDay = {
  id?: number;
  date?: string;
  day_name?: string;
  status?: { name?: string; code?: string };
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
  const [reason, setReason] = useState("");
  const [selectedDayId, setSelectedDayId] = useState<number | null>(null);
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

  async function run(action: "submit" | "approve" | "reject" | "revert") {
    if (employeeId == null) {
      toast.error("Missing employee", "Employee id required for this action");
      return;
    }
    try {
      if (action === "submit") {
        window.prompt("Optional remarks for submit:");
        await submit.mutateAsync({ id, employeeId });
        toast.success("Submitted");
      }
      if (action === "approve") {
        const approvalReason =
          reason.trim() ||
          window.prompt("Optional approval remarks:") ||
          "";
        await approve.mutateAsync({
          id,
          employeeId,
          reason: approvalReason,
        });
        toast.success("Approved");
      }
      if (action === "reject") {
        const rejectReason =
          reason.trim() || window.prompt("Reject reason (required):") || "";
        if (!rejectReason.trim()) {
          toast.warning("Reason required", "Please enter a reject reason");
          return;
        }
        await reject.mutateAsync({
          id,
          employeeId,
          reason: rejectReason,
        });
        toast.success("Rejected");
      }
      if (action === "revert") {
        const revertReason =
          reason.trim() ||
          window.prompt("Optional revert remarks:") ||
          "";
        await revert.mutateAsync({
          id,
          employeeId,
          remarks: revertReason,
        });
        toast.success("Reverted", "Timesheet returned to draft");
      }
      setReason("");
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
        title={`Timesheet #${data?.id ?? id}`}
        description={`${employeeName} · ${data?.period_range || data?.code || ""}${
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

      <Card className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Actions</h2>
        <TextInput
          label="Remarks (approve / reject / revert)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {perms?.can_submit ? (
            <Button loading={busy} onClick={() => void run("submit")}>
              Submit for approval
            </Button>
          ) : null}
          {perms?.can_approve ? (
            <Button loading={busy} onClick={() => void run("approve")}>
              Approve
            </Button>
          ) : null}
          {perms?.can_reject ? (
            <Button
              variant="danger"
              loading={busy}
              onClick={() => void run("reject")}
            >
              Reject
            </Button>
          ) : null}
          {perms?.can_revert_to_draft ? (
            <Button
              variant="secondary"
              loading={busy}
              onClick={() => void run("revert")}
            >
              Revert to draft
            </Button>
          ) : null}
        </div>
      </Card>

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
                  <th className="px-3 py-2 font-medium">Status</th>
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
                    <td className="px-3 py-2">
                      {day.status?.name || day.status?.code || "—"}
                    </td>
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
    </div>
  );
}
