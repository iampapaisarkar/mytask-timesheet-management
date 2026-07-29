import { useState } from "react";
import { useManagementGroups } from "@mytask/hooks";
import { can, getOrganisationAcl } from "@mytask/services";
import { Button } from "@/components/ui/Button";
import { ResourceListPage } from "@/features/shared/ResourceListPage";
import { useOrganisationStore } from "@/store/organisationStore";
import { ManagementGroupFormDialog } from "./ManagementGroupFormDialog";

type MgRow = {
  id?: number | string;
  name?: string;
  group_managers?: Array<{ id?: number }>;
  group_staffs?: Array<{ id?: number }>;
};

export function ManagementGroupsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MgRow | null>(null);
  const role = useOrganisationStore((s) => s.organisation?.role);
  const acl = getOrganisationAcl(role);
  const canCreate = can(acl, "managementGroup", "create");
  const canEdit = can(acl, "managementGroup", "edit");
  const query = useManagementGroups({ rows_per_page: 50, sort_by: "id" });

  return (
    <>
      <ResourceListPage
        title="Management groups"
        query={query}
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
                setEditing(row as MgRow);
                setDialogOpen(true);
              }
            : undefined
        }
        columns={[
          { key: "id", label: "ID" },
          { key: "name", label: "Name" },
          { key: "code", label: "Code" },
          {
            key: "managers",
            label: "Managers",
            accessor: (row) =>
              Array.isArray(row.group_managers)
                ? row.group_managers.length
                : 0,
          },
          {
            key: "staffs",
            label: "Staff",
            accessor: (row) =>
              Array.isArray(row.group_staffs) ? row.group_staffs.length : 0,
          },
        ]}
        rowActions={
          canEdit
            ? (row) => (
                <Button
                  variant="soft"
                  className="px-2.5 py-1.5 text-xs"
                  onClick={() => {
                    setEditing(row as MgRow);
                    setDialogOpen(true);
                  }}
                >
                  Edit
                </Button>
              )
            : undefined
        }
      />
      <ManagementGroupFormDialog
        open={dialogOpen}
        group={editing}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
      />
    </>
  );
}
