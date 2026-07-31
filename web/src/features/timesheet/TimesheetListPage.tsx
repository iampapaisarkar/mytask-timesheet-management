import { useEffect, useMemo, useState } from "react";
import { useJobs, useTimesheets } from "@mytask/hooks";
import { DEFAULT_LIST_PAGE_SIZE, ROUTES } from "@mytask/constants";
import { listRows } from "@mytask/utils";
import { ResourceListPage } from "@/features/shared/ResourceListPage";

const selectClass =
  "mt-focus w-full rounded-xl border border-border bg-[var(--mt-surface)] px-3 py-2.5 text-sm text-[var(--mt-text)] outline-none focus:border-primary sm:w-auto";

const inputClass =
  "mt-focus w-full min-w-0 rounded-xl border border-border bg-[var(--mt-surface)] px-3 py-2.5 text-sm text-[var(--mt-text)] outline-none focus:border-primary sm:min-w-[12rem] sm:flex-1";

type JobRow = {
  id?: number;
  name?: string;
  details?: { id?: number; name?: string };
};

export function TimesheetListPage() {
  const [jobId, setJobId] = useState("");
  const [statusCode, setStatusCode] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const listParams = useMemo(() => {
    const params: Record<string, unknown> = {
      rows_per_page: DEFAULT_LIST_PAGE_SIZE,
      page_number: page,
      sort_by: "id",
    };
    if (jobId) params.job_id = jobId;
    if (statusCode) params.status_code = statusCode;
    if (debouncedSearch) params.search = debouncedSearch;
    return params;
  }, [jobId, statusCode, page, debouncedSearch]);

  const query = useTimesheets(listParams);
  const jobsQuery = useJobs({ rows_per_page: 200 });
  const jobs = listRows<JobRow>(jobsQuery.data);

  return (
    <>
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <label className="flex w-full min-w-0 flex-1 flex-col gap-1 text-sm sm:min-w-[14rem]">
          <span className="font-medium text-muted">Search by code</span>
          <input
            className={inputClass}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Timesheet code"
            aria-label="Search by timesheet code"
          />
        </label>
        <select
          className={selectClass}
          value={jobId}
          onChange={(e) => {
            setJobId(e.target.value);
            setPage(1);
          }}
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
          onChange={(e) => {
            setStatusCode(e.target.value);
            setPage(1);
          }}
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
        page={page}
        onPageChange={setPage}
        columns={[
          { key: "code", label: "Code" },
          { key: "period_range", label: "Period" },
          {
            key: "jobs",
            label: "Jobs",
            accessor: (row) => {
              const jobsCol = row.jobs as Array<{ name?: string }> | undefined;
              if (Array.isArray(jobsCol) && jobsCol.length) {
                return jobsCol.map((j) => j.name).filter(Boolean).join(", ");
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
