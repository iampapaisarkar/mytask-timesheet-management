import { useEffect, useState } from "react";
import { useCustomers, useJobs } from "@mytask/hooks";
import { DEFAULT_LIST_PAGE_SIZE } from "@mytask/constants";
import { can, getOrganisationAcl } from "@mytask/services";
import { listRows } from "@mytask/utils";
import { Button } from "@/components/ui/Button";
import { ResourceListPage } from "@/features/shared/ResourceListPage";
import { useOrganisationStore } from "@/store/organisationStore";
import { JobFormDialog, type JobRow } from "./CreateJobDialog";

const selectClass =
  "mt-focus rounded-xl border border-border bg-[var(--mt-surface)] px-3 py-2 text-sm text-[var(--mt-text)] outline-none focus:border-primary";

const inputClass =
  "mt-focus min-w-[12rem] flex-1 rounded-xl border border-border bg-[var(--mt-surface)] px-3 py-2 text-sm text-[var(--mt-text)] outline-none focus:border-primary";

type CustomerRow = {
  id?: number | string;
  name?: string;
};

export function JobsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<JobRow | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [customerId, setCustomerId] = useState("");
  const role = useOrganisationStore((s) => s.organisation?.role);
  const acl = getOrganisationAcl(role);
  const canCreate = can(acl, "job", "create");
  const canEdit = can(acl, "job", "edit");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, customerId]);

  const customersQuery = useCustomers({ rows_per_page: 200, sort_by: "name" });
  const customers = listRows<CustomerRow>(customersQuery.data);

  const query = useJobs({
    rows_per_page: DEFAULT_LIST_PAGE_SIZE,
    page_number: page,
    sort_by: "id",
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(customerId ? { customer_id: customerId } : {}),
  });

  return (
    <>
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <label className="flex min-w-[14rem] flex-1 flex-col gap-1 text-sm">
          <span className="font-medium text-muted">Search by job name</span>
          <input
            className={inputClass}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Job name"
            aria-label="Search jobs"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-muted">Customer</span>
          <select
            className={selectClass}
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            aria-label="Filter by customer"
          >
            <option value="">All customers</option>
            {customers.map((cust) => (
              <option key={String(cust.id)} value={String(cust.id)}>
                {cust.name || `Customer #${cust.id}`}
              </option>
            ))}
          </select>
        </label>
        {customerId ? (
          <Button
            variant="secondary"
            className="px-3 py-2 text-sm"
            onClick={() => setCustomerId("")}
          >
            Clear customer
          </Button>
        ) : null}
      </div>
      <ResourceListPage
        title="Jobs"
        query={query}
        page={page}
        onPageChange={setPage}
        createLabel={canCreate ? "Create" : undefined}
        onCreate={
          canCreate
            ? () => {
                setEditing(null);
                setDialogOpen(true);
              }
            : undefined
        }
        onRowClick={
          canEdit
            ? (row) => {
                setEditing(row as JobRow);
                setDialogOpen(true);
              }
            : undefined
        }
        columns={[
          { key: "id", label: "ID" },
          { key: "name", label: "Name" },
          {
            key: "customer",
            label: "Customer",
            accessor: (row) =>
              (row.customer as { name?: string } | undefined)?.name,
          },
          { key: "site_contact_name", label: "Site contact" },
        ]}
        rowActions={
          canEdit
            ? (row) => (
                <Button
                  variant="soft"
                  className="px-2.5 py-1.5 text-xs"
                  onClick={() => {
                    setEditing(row as JobRow);
                    setDialogOpen(true);
                  }}
                >
                  Edit
                </Button>
              )
            : undefined
        }
      />
      <JobFormDialog
        open={dialogOpen}
        job={editing}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
      />
    </>
  );
}
