import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { timesheetsApi } from "@mytask/api";
import { useSubmitTimesheet } from "@mytask/hooks";
import { ROUTES } from "@mytask/constants";
import { formatTimesheetLabel, getErrorMessage } from "@mytask/utils";
import { Card, PageHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { useToastStore } from "@/store/toastStore";
import { TimesheetDayEditor } from "@/features/timesheet/TimesheetDayEditor";
import { RemarksConfirmDialog } from "@/features/timesheet/RemarksConfirmDialog";

type TimesheetDay = {
  id?: number;
  date?: string;
  day_name?: string;
  total_hours?: number | string;
  is_public_holiday?: boolean;
  tasks?: Array<{ total_hours?: number | string }>;
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
  employee?: { user?: { full_name?: string } };
};

export function TimesheetDetailPage() {
  const { orgCode = "", id = "" } = useParams();
  const toast = useToastStore();
  const submit = useSubmitTimesheet();
  const [selectedDayId, setSelectedDayId] = useState<number | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);

  const query = useQuery({
    queryKey: ["timesheets", id] as const,
    queryFn: async () => {
      const res = await timesheetsApi.get(id);
      return (res.data as { data: TimesheetDetail }).data;
    },
    enabled: Boolean(id),
  });

  const data = query.data;

  const days = useMemo(() => {
    const list = Array.isArray(data?.days) ? data.days : [];
    return list.map((day) => {
      if (day.total_hours != null) return day;
      const tasks = Array.isArray(day.tasks) ? day.tasks : [];
      const sum = tasks.reduce((acc, t) => {
        const h = parseFloat(String(t.total_hours ?? 0));
        return acc + (Number.isFinite(h) ? h : 0);
      }, 0);
      return { ...day, total_hours: Number(sum.toFixed(2)) };
    });
  }, [data?.days]);

  async function confirmSubmit(remarks: string) {
    try {
      await submit.mutateAsync({ id, remarks });
      toast.success("Submitted", "Timesheet submitted for approval");
      setSubmitOpen(false);
      void query.refetch();
    } catch (err) {
      toast.error("Submit failed", getErrorMessage(err));
    }
  }

  if (!id) {
    return <ErrorState message="Missing timesheet id in the URL." />;
  }

  if (query.isLoading) return <LoadingState label="Loading timesheet…" />;
  if (query.isError) {
    return (
      <ErrorState
        message={getErrorMessage(
          query.error,
          "Unable to load this timesheet. You may not have access, or it may belong to another employee.",
        )}
        onRetry={() => void query.refetch()}
      />
    );
  }

  if (!data) {
    return (
      <ErrorState
        message="Timesheet not found."
        onRetry={() => void query.refetch()}
      />
    );
  }

  const perms = data.permissions;
  const existingRemarks =
    (data.reject_reason || data.approval_reason || "").trim() || null;
  const existingRemarksLabel = data.reject_reason
    ? "Reject remarks"
    : data.approval_reason
      ? "Approval remarks"
      : "Remarks";

  return (
    <div className="mt-fade-in flex flex-col gap-4">
      <PageHeader
        title={formatTimesheetLabel(
          { code: data.code, id: data.id ?? id },
          { prefix: true },
        )}
        description={
          [
            data.period_range,
            Array.isArray(data.jobs) && data.jobs.length
              ? data.jobs.map((j) => j.name).filter(Boolean).join(", ")
              : data.job?.name,
          ]
            .filter(Boolean)
            .join(" · ") || "Timesheet details"
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to={ROUTES.timesheet(orgCode)}>
              <Button variant="secondary">Back</Button>
            </Link>
            {perms?.can_submit ? (
              <Button
                loading={submit.isPending}
                disabled={submit.isPending}
                onClick={() => setSubmitOpen(true)}
              >
                Submit for approval
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-xs font-medium uppercase text-muted">Status</p>
          <p className="mt-1 text-lg font-semibold text-[var(--mt-text)]">
            {data.status?.name || data.status?.code || "—"}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase text-muted">Period</p>
          <p className="mt-1 text-lg font-semibold text-[var(--mt-text)]">
            {data.period_range ||
              [data.period_start_date, data.period_end_date]
                .filter(Boolean)
                .join(" → ") ||
              "—"}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase text-muted">Jobs</p>
          <p className="mt-1 text-lg font-semibold text-[var(--mt-text)]">
            {Array.isArray(data.jobs) && data.jobs.length
              ? data.jobs.map((j) => j.name).filter(Boolean).join(", ")
              : data.job?.name || "—"}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase text-muted">Code</p>
          <p className="mt-1 text-lg font-semibold text-[var(--mt-text)]">
            {data.code || "—"}
          </p>
        </Card>
      </div>

      {existingRemarks && !perms?.can_submit ? (
        <Card>
          <h2 className="mb-2 text-base font-semibold text-[var(--mt-text)]">
            {existingRemarksLabel}
          </h2>
          <p className="whitespace-pre-wrap text-sm text-[var(--mt-text)]">
            {existingRemarks}
          </p>
        </Card>
      ) : null}

      <Card>
        <h2 className="mb-3 text-base font-semibold text-[var(--mt-text)]">
          Days
        </h2>
        <p className="mb-3 text-xs text-muted">
          Click a day to view or edit tasks
          {perms?.can_save === false ? " (read-only for this status)" : ""}.
        </p>
        {!days.length ? (
          <p className="text-sm text-muted">No days on this timesheet yet.</p>
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
                    <td className="px-3 py-2">
                      {day.day_name ||
                        (day.is_public_holiday ? "Holiday" : "—")}
                    </td>
                    <td className="px-3 py-2">{day.total_hours ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <TimesheetDayEditor
        mode="self"
        timesheetId={id}
        dayId={selectedDayId}
        open={selectedDayId != null}
        onClose={() => setSelectedDayId(null)}
        onSaved={() => void query.refetch()}
      />

      <RemarksConfirmDialog
        open={submitOpen}
        action="submit"
        loading={submit.isPending}
        onClose={() => setSubmitOpen(false)}
        onConfirm={confirmSubmit}
      />
    </div>
  );
}
