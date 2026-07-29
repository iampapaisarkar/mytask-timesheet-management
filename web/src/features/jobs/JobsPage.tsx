import { useState } from "react";
import { useJobs } from "@mytask/hooks";
import { ResourceListPage } from "@/features/shared/ResourceListPage";
import { CreateJobDialog } from "./CreateJobDialog";

export function JobsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const query = useJobs({ rows_per_page: 50, sort_by: "id" });
  return (
    <>
      <ResourceListPage
        title="Jobs"
        query={query}
        createLabel="Create"
        onCreate={() => setCreateOpen(true)}
        columns={[
          { key: "id", label: "ID" },
          { key: "name", label: "Name" },
          { key: "site_contact_name", label: "Site contact" },
        ]}
      />
      <CreateJobDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}
