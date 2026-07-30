import { useMemo, useState } from "react";
import { useJobs, useTimesheets } from "@mytask/hooks";
import { ROUTES } from "@mytask/constants";
import { ResourceListPage } from "@/features/shared/ResourceListPage";

const selectClass =
  "mt-focus rounded-xl border border-border bg-[var(--mt-surface)] px-3 py-2 text-sm text-[var(--mt-text)] outline-none focus:border-primary";

type JobRow = {
  id?: number;
  name?: string;
  details?: { id?: number; name?: string };
};

export function TimesheetListPage() {
  const [jobId, setJobId] = useState("");
  const [statusCode, setStatusCode] = useState("");

  const listParams = useMemo(() => {
    const params: Record<string, unknown> = {
      rows_per_page: 50,
      sort_by: "id",
    };
    if (jobId) params.job_id = jobId;
    if (statusCode) params.status_code = statusCode;
    return params;
  }, [jobId, statusCode]);

  const query = useTimesheets(listParams);
  const jobsQuery = useJobs({ rows_per_page: 200 });
  const jobs = (Array.isArray(jobsQuery.data)
    ? jobsQuery.data
    : []) as JobRow[];

  return (
    <>
      <div className="mb-3 flex flex-wrap gap-2">
        <select
          className={selectClass}
          value={jobId}
          onChange={(e) => setJobId(e.target.value)}
          aria-label="Filter by job"
        >
          <option value="">All jobs</option>
          {jobs.map((job) => {
            const id = job.details?.id ?? job.id;
            return (
              <option key={String(id)} value={String(id)}>
                {job.details?.name || job.name || `Job #${id}`}
              </option>
            );
          })}
        </select>
        <select
          className={selectClass}
          value={statusCode}
          onChange={(e) => setStatusCode(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
      <ResourceListPage
        title="My Sheets"
        query={query}
        columns={[
          { key: "id", label: "ID" },
          { key: "code", label: "Code" },
          { key: "period_range", label: "Period" },
          {
            key: "jobs",
            label: "Jobs",
            accessor: (row) => {
              const jobs = row.jobs as Array<{ name?: string }> | undefined;
              if (Array.isArray(jobs) && jobs.length) {
                return jobs.map((j) => j.name).filter(Boolean).join(", ");
              }
              return (row.job as { name?: string } | undefined)?.name;
            },
          },
          { key: "status", label: "Status", accessor: "status.name" },
        ]}
        detailPath={ROUTES.timesheetDetails}
      />
    </>
  );
}
