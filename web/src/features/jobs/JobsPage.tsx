import { useJobs } from "@mytask/hooks";
import { ResourceListPage } from "@/features/shared/ResourceListPage";

export function JobsPage() {
  const query = useJobs();
  return (
    <ResourceListPage
      title="Jobs"
      query={query}
      createLabel="Create"
      columns={[
        { key: "id", label: "ID" },
        { key: "name", label: "Name" },
      ]}
    />
  );
}
