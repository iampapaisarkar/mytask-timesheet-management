import { useEffect, useState } from "react";
import { useEmployees } from "@mytask/hooks";
import { DEFAULT_LIST_PAGE_SIZE } from "@mytask/constants";
import { can, getOrganisationAcl } from "@mytask/services";
import { formatPhoneDisplay } from "@mytask/utils";
import { Button } from "@/components/ui/Button";
import { ResourceListPage, getRowId, type Row } from "@/features/shared/ResourceListPage";
import { useOrganisationStore } from "@/store/organisationStore";
import {
  CreateEmployeeDialog,
  InviteEmployeeButton,
  type EmployeeListRow,
} from "./CreateEmployeeDialog";

function invitationStatusCode(row: Row): string | undefined {
  const details = row.details as
    | { invitation?: { status?: { code?: string } } }
    | undefined;
  return (
    details?.invitation?.status?.code ||
    (row.invitation as { status?: { code?: string } } | undefined)?.status?.code
  );
}

function employeeRoleCode(row: Row): string | undefined {
  const details = row.details as
    | { role?: { code?: string }; is_you?: boolean }
    | undefined;
  return (
    details?.role?.code ||
    (row.role as { code?: string } | undefined)?.code
  );
}

function shouldShowInvite(row: Row): boolean {
  const details = row.details as { is_you?: boolean } | undefined;
  if (details?.is_you) return false;
  const roleCode = employeeRoleCode(row);
  if (roleCode === "owner") return false;
  const code = invitationStatusCode(row);
  if (code === "accept") return false;
  return true;
}

const inputClass =
  "mt-focus w-full max-w-md rounded-xl border border-border bg-[var(--mt-surface)] px-3 py-2 text-sm text-[var(--mt-text)] outline-none focus:border-primary";

export function EmployeesPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<EmployeeListRow | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const role = useOrganisationStore((s) => s.organisation?.role);
  const acl = getOrganisationAcl(role);
  const canCreate = can(acl, "employee", "create");
  const canEdit = can(acl, "employee", "edit");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const query = useEmployees({
    rows_per_page: DEFAULT_LIST_PAGE_SIZE,
    page_number: page,
    sort_by: "id",
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  });

  function openEdit(row: Row) {
    if (!canEdit) return;
    setEditing(row as EmployeeListRow);
    setCreateOpen(true);
  }

  return (
    <>
      <div className="mb-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-muted">
            Search name, email, or address
          </span>
          <input
            className={inputClass}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="e.g. Jane, jane@…, street"
          />
        </label>
      </div>
      <ResourceListPage
        title="Employees"
        query={query}
        page={page}
        onPageChange={setPage}
        createLabel={canCreate ? "Create" : undefined}
        onCreate={
          canCreate
            ? () => {
                setEditing(null);
                setCreateOpen(true);
              }
            : undefined
        }
        onRowClick={canEdit ? openEdit : undefined}
        columns={[
          {
            key: "id",
            label: "ID",
            accessor: (row) =>
              (row.details as { id?: number } | undefined)?.id ?? row.id,
          },
          {
            key: "name",
            label: "Name",
            accessor: (row) =>
              (row.details as { full_name?: string } | undefined)?.full_name,
          },
          {
            key: "email",
            label: "Email",
            accessor: (row) =>
              (row.details as { email?: string } | undefined)?.email,
          },
          {
            key: "role",
            label: "Role",
            accessor: (row) =>
              (row.details as { role?: { name?: string } } | undefined)?.role
                ?.name,
          },
          {
            key: "phone",
            label: "Phone",
            accessor: (row) => {
              const details = row.details as
                | {
                    phone_number?: string;
                    phone_country_iso?: string;
                  }
                | undefined;
              return (
                formatPhoneDisplay(
                  details?.phone_number,
                  details?.phone_country_iso,
                ) || "—"
              );
            },
          },
        ]}
        rowActions={
          canEdit
            ? (row) => {
                const id = getRowId(row, 0);
                return (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="soft"
                      className="px-2.5 py-1.5 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(row);
                      }}
                    >
                      Edit
                    </Button>
                    {shouldShowInvite(row) ? (
                      <InviteEmployeeButton employeeId={id} />
                    ) : null}
                  </div>
                );
              }
            : undefined
        }
      />
      <CreateEmployeeDialog
        open={createOpen}
        employee={editing}
        onClose={() => {
          setCreateOpen(false);
          setEditing(null);
        }}
      />
    </>
  );
}
