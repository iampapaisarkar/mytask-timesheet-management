import { useState } from "react";
import { useJobs } from "@mytask/hooks";
import { can, getOrganisationAcl } from "@mytask/services";
import { ResourceListPage } from "@/features/shared/ResourceListPage";
import { useOrganisationStore } from "@/store/organisationStore";
import { CreateJobDialog } from "./CreateJobDialog";

export function JobsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const role = useOrganisationStore((s) => s.organisation?.role);
  const acl = getOrganisationAcl(role);
  const canCreate = can(acl, "job", "create");
  const query = useJobs({ rows_per_page: 50, sort_by: "id" });

  return (
    <>
      <ResourceListPage
        title="Jobs"
        query={query}
        createLabel={canCreate ? "Create" : undefined}
        onCreate={canCreate ? () => setCreateOpen(true) : undefined}
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
          {
            key: "is_active",
            label: "Active",
            accessor: (row) => (row.is_active === false ? "No" : "Yes"),
          },
        ]}
      />
      <CreateJobDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}
