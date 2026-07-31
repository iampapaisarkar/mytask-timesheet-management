import { useEffect, useState } from "react";
import { useCustomers } from "@mytask/hooks";
import { DEFAULT_LIST_PAGE_SIZE, formatMoney } from "@mytask/constants";
import { can, getOrganisationAcl } from "@mytask/services";
import { formatPhoneDisplay } from "@mytask/utils";
import { Button } from "@/components/ui/Button";
import { ResourceListPage } from "@/features/shared/ResourceListPage";
import { useOrganisationStore } from "@/store/organisationStore";
import {
  CustomerFormDialog,
  type CustomerRow,
} from "./CreateCustomerDialog";

const inputClass =
  "mt-focus w-full max-w-md rounded-xl border border-border bg-[var(--mt-surface)] px-3 py-2 text-sm text-[var(--mt-text)] outline-none focus:border-primary";

export function CustomersPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerRow | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const role = useOrganisationStore((s) => s.organisation?.role);
  const acl = getOrganisationAcl(role);
  const canCreate = can(acl, "customer", "create");
  const canEdit = can(acl, "customer", "edit");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const query = useCustomers({
    rows_per_page: DEFAULT_LIST_PAGE_SIZE,
    page_number: page,
    sort_by: "id",
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  });

  return (
    <>
      <div className="mb-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-muted">Search name or email</span>
          <input
            className={inputClass}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Customer name or email"
            aria-label="Search customers"
          />
        </label>
      </div>
      <ResourceListPage
        title="Customers"
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
                setEditing(row as CustomerRow);
                setDialogOpen(true);
              }
            : undefined
        }
        columns={[
          { key: "id", label: "ID" },
          { key: "name", label: "Name" },
          { key: "abn", label: "Business / tax ID" },
          { key: "contact_name", label: "Contact" },
          { key: "contact_email", label: "Email" },
          {
            key: "contact_phone_number",
            label: "Phone",
            accessor: (row) =>
              formatPhoneDisplay(
                row.contact_phone_number as string | undefined,
                row.contact_phone_country_iso as string | undefined,
              ) || "—",
          },
          {
            key: "hourly_rate",
            label: "Hourly rate",
            accessor: (row) =>
              row.hourly_rate != null
                ? formatMoney(
                    row.hourly_rate as number | string,
                    (row.currency as string | undefined) || "AUD",
                  )
                : "—",
          },
          {
            key: "currency",
            label: "Currency",
            accessor: (row) =>
              (row.currency as string | undefined) || "—",
          },
        ]}
        rowActions={
          canEdit
            ? (row) => (
                <Button
                  variant="soft"
                  className="px-2.5 py-1.5 text-xs"
                  onClick={() => {
                    setEditing(row as CustomerRow);
                    setDialogOpen(true);
                  }}
                >
                  Edit
                </Button>
              )
            : undefined
        }
      />
      <CustomerFormDialog
        open={dialogOpen}
        customer={editing}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
      />
    </>
  );
}
