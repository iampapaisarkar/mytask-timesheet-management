import { useManagementGroups } from "@mytask/hooks";
import { ResourceListPage } from "@/features/shared/ResourceListPage";

export function ManagementGroupsPage() {
  const query = useManagementGroups();
  return (
    <ResourceListPage
      title="Management Groups"
      query={query}
      createLabel="Create"
      columns={[
        { key: "id", label: "ID" },
        { key: "name", label: "Name" },
      ]}
    />
  );
}
