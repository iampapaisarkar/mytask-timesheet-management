import { useState } from "react";
import { useEmployees } from "@mytask/hooks";
import { can, getOrganisationAcl } from "@mytask/services";
import { ResourceListPage, getRowId } from "@/features/shared/ResourceListPage";
import { useOrganisationStore } from "@/store/organisationStore";
import {
  CreateEmployeeDialog,
  InviteEmployeeButton,
} from "./CreateEmployeeDialog";

export function EmployeesPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const role = useOrganisationStore((s) => s.organisation?.role);
  const acl = getOrganisationAcl(role);
  const canCreate = can(acl, "employee", "create");
  const canEdit = can(acl, "employee", "edit");
  const query = useEmployees({ rows_per_page: 50, sort_by: "id" });

  return (
    <>
      <ResourceListPage
        title="Employees"
        query={query}
        createLabel={canCreate ? "Create" : undefined}
        onCreate={canCreate ? () => setCreateOpen(true) : undefined}
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
                return <InviteEmployeeButton employeeId={id} />;
              }
            : undefined
        }
      />
      <CreateEmployeeDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </>
  );
}
