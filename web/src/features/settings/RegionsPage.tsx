import { useRegions } from "./settingsHooks";
import { ResourceListPage } from "@/features/shared/ResourceListPage";

export function RegionsPage() {
  const query = useRegions();
  return (
    <ResourceListPage
      title="Regions"
      query={query}
      columns={[
        { key: "id", label: "ID" },
        { key: "name", label: "Name" },
        { key: "code", label: "Code" },
      ]}
    />
  );
}
