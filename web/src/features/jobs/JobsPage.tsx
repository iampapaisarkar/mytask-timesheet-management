import { useState } from "react";
import { useJobs } from "@mytask/hooks";
import { can, getOrganisationAcl } from "@mytask/services";
import { Button } from "@/components/ui/Button";
import { ResourceListPage } from "@/features/shared/ResourceListPage";
import { useOrganisationStore } from "@/store/organisationStore";
import { JobFormDialog, type JobRow } from "./CreateJobDialog";

export function JobsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<JobRow | null>(null);
  const role = useOrganisationStore((s) => s.organisation?.role);
  const acl = getOrganisationAcl(role);
  const canCreate = can(acl, "job", "create");
  const canEdit = can(acl, "job", "edit");
  const query = useJobs({ rows_per_page: 50, sort_by: "id" });

  return (
    <>
      <ResourceListPage
        title="Jobs"
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
