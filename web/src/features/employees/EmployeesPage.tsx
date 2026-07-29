import { useState } from "react";
import { useEmployees } from "@mytask/hooks";
import { can, getOrganisationAcl } from "@mytask/services";
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
  // Accepted members should not see Invite again
  if (code === "accept") return false;
  return true;
}

export function EmployeesPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<EmployeeListRow | null>(null);
  const role = useOrganisationStore((s) => s.organisation?.role);
  const acl = getOrganisationAcl(role);
  const canCreate = can(acl, "employee", "create");
  const canEdit = can(acl, "employee", "edit");
  const query = useEmployees({ rows_per_page: 50, sort_by: "id" });

  function openEdit(row: Row) {
    if (!canEdit) return;
    setEditing(row as EmployeeListRow);
    setCreateOpen(true);
  }

  return (
    <>
      <ResourceListPage
        title="Employees"
        query={query}
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
            accessor: (row) =>
              (row.details as { phone_number?: string } | undefined)
                ?.phone_number,
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
