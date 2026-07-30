import { useState } from "react";
import { useEmployees } from "@mytask/hooks";
import { DEFAULT_LIST_PAGE_SIZE } from "@mytask/constants";
import { can, getOrganisationAcl } from "@mytask/services";
import { formatPhoneDisplay, listCountryIsos } from "@mytask/utils";
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

function shouldShowInvite(row: Row): boolean {
  const code = invitationStatusCode(row);
  if (code === "accept") return false;
  return true;
}

const selectClass =
  "mt-focus rounded-xl border border-border bg-[var(--mt-surface)] px-3 py-2 text-sm text-[var(--mt-text)] outline-none focus:border-primary";

export function EmployeesPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<EmployeeListRow | null>(null);
  const [countryIso, setCountryIso] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [page, setPage] = useState(1);
  const role = useOrganisationStore((s) => s.organisation?.role);
  const acl = getOrganisationAcl(role);
  const canCreate = can(acl, "employee", "create");
  const canEdit = can(acl, "employee", "edit");
  const query = useEmployees({
    rows_per_page: DEFAULT_LIST_PAGE_SIZE,
    page_number: page,
    sort_by: "id",
    ...(countryIso ? { phone_country_iso: countryIso } : {}),
    ...(countryCode ? { phone_country_code: countryCode } : {}),
  });

  function openEdit(row: Row) {
    if (!canEdit) return;
    setEditing(row as EmployeeListRow);
    setCreateOpen(true);
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-muted">Filter by country</span>
          <select
            className={selectClass}
            value={countryIso}
            onChange={(e) => {
              setCountryIso(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All countries</option>
            {listCountryIsos().map((iso) => (
              <option key={iso} value={iso}>
                {iso}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-muted">Country code</span>
          <input
            className={selectClass}
            placeholder="+91"
            value={countryCode}
            onChange={(e) => {
              setCountryCode(e.target.value);
              setPage(1);
            }}
          />
        </label>
        {(countryIso || countryCode) && (
          <Button
            variant="secondary"
            className="px-3 py-2 text-sm"
            onClick={() => {
              setCountryIso("");
              setCountryCode("");
              setPage(1);
            }}
          >
            Clear filters
          </Button>
        )}
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
            key: "country",
            label: "Country",
            accessor: (row) =>
              (row.details as { phone_country_iso?: string } | undefined)
                ?.phone_country_iso || "—",
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
