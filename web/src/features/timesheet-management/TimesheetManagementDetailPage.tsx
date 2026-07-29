import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  useApproveTimesheet,
  useRejectTimesheet,
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
  days?: TimesheetDay[];
  permissions?: {
    can_submit?: boolean;
    can_approve?: boolean;
    can_reject?: boolean;
  };
  employee?: { user?: { full_name?: string }; details?: { full_name?: string } };
};

export function TimesheetManagementDetailPage() {
  const { orgCode = "", id = "" } = useParams();
  const toast = useToastStore();
  const [reason, setReason] = useState("");
  const query = useTimesheetManagementItem(id);
  const submit = useSubmitTimesheetManagement();
  const approve = useApproveTimesheet();
  const reject = useRejectTimesheet();
  const data = query.data as TimesheetDetail | undefined;

  const employeeName =
    data?.employee?.user?.full_name ||
    data?.employee?.details?.full_name ||
    "Employee";

  async function run(
    action: "submit" | "approve" | "reject",
  ) {
    try {
      if (action === "submit") await submit.mutateAsync(id);
      if (action === "approve")
        await approve.mutateAsync({ id, reason });
      if (action === "reject") {
        if (!reason.trim()) {
          toast.warning("Reason required", "Please enter a reject reason");
          return;
        }
        await reject.mutateAsync({ id, reason });
      }
      toast.success(
        action === "submit"
          ? "Submitted"
          : action === "approve"
            ? "Approved"
            : "Rejected",
      );
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
  const statusCode = data?.status?.code;
  const busy = submit.isPending || approve.isPending || reject.isPending;

  return (
    <div className="mt-fade-in flex flex-col gap-4">
      <PageHeader
        title={`Timesheet #${data?.id ?? id}`}
        description={`${employeeName} · ${data?.period_range || data?.code || ""}`}
        actions={
          <Link to={ROUTES.timesheetManagement(orgCode)}>
            <Button variant="secondary">Back</Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs font-medium uppercase text-muted">Status</p>
          <p className="mt-1 text-lg font-semibold">
            {data?.status?.name || statusCode || "—"}
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
      </div>

      <Card className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Actions</h2>
        <TextInput
          label="Reason (required for reject)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {statusCode === "draft" ? (
            <Button loading={busy} onClick={() => void run("submit")}>
              Submit for approval
            </Button>
          ) : null}
          {statusCode === "submitted" ? (
            <>
              <Button loading={busy} onClick={() => void run("approve")}>
                Approve
              </Button>
              <Button
                variant="danger"
                loading={busy}
                onClick={() => void run("reject")}
              >
                Reject
              </Button>
            </>
          ) : null}
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-base font-semibold">Days</h2>
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
                    className="border-b border-border last:border-0"
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
    </div>
  );
}
