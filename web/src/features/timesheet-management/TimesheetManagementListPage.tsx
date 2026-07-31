import { useEffect, useMemo, useState } from "react";
import {
  useEmployees,
  useJobs,
  useTimesheetManagement,
} from "@mytask/hooks";
import { DEFAULT_LIST_PAGE_SIZE, ROUTES } from "@mytask/constants";
import { listRows } from "@mytask/utils";
import { ResourceListPage } from "@/features/shared/ResourceListPage";
import { CreateTimesheetDialog } from "./CreateTimesheetDialog";

const selectClass =
  "mt-focus rounded-xl border border-border bg-[var(--mt-surface)] px-3 py-2 text-sm text-[var(--mt-text)] outline-none focus:border-primary";

const inputClass =
  "mt-focus min-w-[12rem] flex-1 rounded-xl border border-border bg-[var(--mt-surface)] px-3 py-2 text-sm text-[var(--mt-text)] outline-none focus:border-primary";

type EmployeeRow = {
  details?: { id?: number; full_name?: string; email?: string };
  id?: number;
};

type JobRow = {
  id?: number;
  name?: string;
  details?: { id?: number; name?: string };
};

export function TimesheetManagementListPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
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
    if (employeeId) params.employee_id = employeeId;
    if (jobId) params.job_id = jobId;
    if (statusCode) params.status_code = statusCode;
    if (debouncedSearch) params.search = debouncedSearch;
    return params;
  }, [employeeId, jobId, statusCode, page, debouncedSearch]);

  const query = useTimesheetManagement(listParams);
  const employeesQuery = useEmployees({ rows_per_page: 200 });
  const jobsQuery = useJobs({ rows_per_page: 200 });

  const employees = listRows<EmployeeRow>(employeesQuery.data);
  const jobs = listRows<JobRow>(jobsQuery.data);

  return (
    <>
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <label className="flex min-w-[14rem] flex-1 flex-col gap-1 text-sm">
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
          value={employeeId}
          onChange={(e) => {
            setEmployeeId(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by employee"
        >
          <option value="">All employees</option>
          {employees.map((emp) => {
            const id = emp.details?.id ?? emp.id;
            return (
              <option key={String(id)} value={String(id)}>
                {emp.details?.full_name ||
                  emp.details?.email ||
                  `Employee #${id}`}
              </option>
            );
          })}
        </select>
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
        title="Timesheets"
        query={query}
        page={page}
        onPageChange={setPage}
        createLabel="Create"
        onCreate={() => setCreateOpen(true)}
        columns={[
          { key: "code", label: "Code" },
          {
            key: "employee",
            label: "Employee",
            accessor: (row) =>
              (row.employee as { user?: { full_name?: string } } | undefined)
                ?.user?.full_name,
          },
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
        detailPath={ROUTES.timesheetManagementDetails}
      />
      <CreateTimesheetDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </>
  );
}
