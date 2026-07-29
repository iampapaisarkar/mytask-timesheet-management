import { Link, useParams } from "react-router-dom";
import {
  useSubmitTimesheet,
  useTimesheet,
} from "@mytask/hooks";
import { ROUTES } from "@mytask/constants";
import { getErrorMessage } from "@mytask/utils";
import { Card, PageHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { useToastStore } from "@/store/toastStore";

type TimesheetDay = {
  id?: number;
  date?: string;
  day_name?: string;
  status?: { name?: string; code?: string };
  total_hours?: number | string;
  is_public_holiday?: boolean;
};

type TimesheetDetail = {
  id?: number;
  code?: string;
  period_range?: string;
  period_start_date?: string;
  period_end_date?: string;
  status?: { name?: string; code?: string };
  days?: TimesheetDay[];
  permissions?: { can_submit?: boolean; can_save?: boolean };
  employee?: { user?: { full_name?: string } };
};

export function TimesheetDetailPage() {
  const { orgCode = "", id = "" } = useParams();
  const toast = useToastStore();
  const query = useTimesheet(id);
  const submit = useSubmitTimesheet();
  const data = query.data as TimesheetDetail | undefined;

  async function handleSubmit() {
    try {
      await submit.mutateAsync(id);
      toast.success("Submitted", "Timesheet submitted for approval");
      void query.refetch();
    } catch (err) {
      toast.error("Submit failed", getErrorMessage(err));
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

  return (
    <div className="mt-fade-in flex flex-col gap-4">
      <PageHeader
        title={`Timesheet #${data?.id ?? id}`}
        description={data?.period_range || data?.code || "Timesheet details"}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to={ROUTES.timesheet(orgCode)}>
              <Button variant="secondary">Back</Button>
            </Link>
            {data?.permissions?.can_submit !== false &&
            data?.status?.code === "draft" ? (
              <Button loading={submit.isPending} onClick={() => void handleSubmit()}>
                Submit for approval
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs font-medium uppercase text-muted">Status</p>
          <p className="mt-1 text-lg font-semibold text-[var(--mt-text)]">
            {data?.status?.name || data?.status?.code || "—"}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase text-muted">Period</p>
          <p className="mt-1 text-lg font-semibold text-[var(--mt-text)]">
            {data?.period_range ||
              [data?.period_start_date, data?.period_end_date]
                .filter(Boolean)
                .join(" → ") ||
              "—"}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase text-muted">Code</p>
          <p className="mt-1 text-lg font-semibold text-[var(--mt-text)]">
            {data?.code || "—"}
          </p>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-base font-semibold text-[var(--mt-text)]">
          Days
        </h2>
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
                    <td className="px-3 py-2">
                      {day.day_name || (day.is_public_holiday ? "Holiday" : "—")}
                    </td>
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
