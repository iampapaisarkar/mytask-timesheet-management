import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { timesheetsApi } from "@mytask/api";
import { useSubmitTimesheet } from "@mytask/hooks";
import { ROUTES, formatHours } from "@mytask/constants";
import { formatTimesheetLabel, getErrorMessage, sumOpenAwareTaskHours } from "@mytask/utils";
import { Card, PageHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { LiveTrackingIndicator } from "@/components/LiveTrackingIndicator";
import { useToastStore } from "@/store/toastStore";
import { useOrganisationStore } from "@/store/organisationStore";
import { useLiveClock } from "@/hooks/useLiveClock";
import { useTrackingLive } from "@/hooks/useTrackingLive";
import { TimesheetDayEditor } from "@/features/timesheet/TimesheetDayEditor";
import { RemarksConfirmDialog } from "@/features/timesheet/RemarksConfirmDialog";

type DayTask = {
  total_hours?: number | string;
  start_time?: string | null;
  end_time?: string | null;
  is_open?: boolean;
};

type TimesheetDay = {
  id?: number;
  date?: string;
  day_name?: string;
  total_hours?: number | string;
  is_public_holiday?: boolean;
  tasks?: DayTask[];
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
  employee?: { id?: number; user?: { full_name?: string } };
  employee_id?: number;
};

export function TimesheetDetailPage() {
  const { orgCode = "", id = "" } = useParams();
  const toast = useToastStore();
  const organisationId = useOrganisationStore((s) => s.organisation?.id);
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
  const trackingLive = useTrackingLive(organisationId, {
    timesheetId: id,
    employeeId: data?.employee?.id ?? data?.employee_id,
  });

  const hasOpenSession = useMemo(() => {
    const list = Array.isArray(data?.days) ? data.days : [];
    return list.some((day) =>
      (Array.isArray(day.tasks) ? day.tasks : []).some(
        (t) => t.is_open || (Boolean(t.start_time) && !t.end_time),
      ),
    );
  }, [data?.days]);

  const liveNow = useLiveClock(Boolean(trackingLive || hasOpenSession));

  useEffect(() => {
    if (!trackingLive) return;
    const timer = globalThis.setInterval(() => {
      void query.refetch();
    }, 5_000);
    return () => globalThis.clearInterval(timer);
  }, [trackingLive, query]);

  const days = useMemo(() => {
    const list = Array.isArray(data?.days) ? data.days : [];
    return list.map((day) => {
      const tasks = Array.isArray(day.tasks) ? day.tasks : [];
      if (!tasks.length) {
        return {
          ...day,
          total_hours:
            day.total_hours != null ? day.total_hours : Number((0).toFixed(2)),
        };
      }
      return {
        ...day,
        total_hours: Number(sumOpenAwareTaskHours(tasks, liveNow).toFixed(2)),
      };
    });
  }, [data?.days, liveNow]);

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
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold text-[var(--mt-text)]">
            Days
          </h2>
          {trackingLive ? <LiveTrackingIndicator /> : null}
        </div>
        <p className="mb-3 text-xs text-muted">
          Click a day to view or edit tasks
          {perms?.can_save === false ? " (read-only for this status)" : ""}.
          {trackingLive
            ? " Live hours and location refresh while tracking is active."
            : ""}
        </p>
        {!days.length ? (
          <p className="text-sm text-muted">No days on this timesheet yet.</p>
        ) : (
          <>
            <div className="flex flex-col gap-2 md:hidden">
              {days.map((day) => (
                <button
                  key={String(day.id ?? day.date)}
                  type="button"
                  className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-border px-3 py-3 text-left transition hover:border-primary/40"
                  onClick={() => day.id != null && setSelectedDayId(day.id)}
                >
                  <div className="min-w-0">
                    <p className="font-medium text-[var(--mt-text)]">
                      {day.date || "—"}
                    </p>
                    <p className="text-xs text-muted">
                      {day.day_name ||
                        (day.is_public_holiday ? "Holiday" : "—")}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-primary">
                    {formatHours(day.total_hours)}
                  </span>
                </button>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
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
                    <td className="px-3 py-2">{formatHours(day.total_hours)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
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
