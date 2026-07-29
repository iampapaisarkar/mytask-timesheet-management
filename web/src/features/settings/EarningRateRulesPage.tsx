import { useAwardRates } from "./settingsHooks";
import { ResourceListPage } from "@/features/shared/ResourceListPage";

export function EarningRateRulesPage() {
  const query = useAwardRates();
  return (
    <ResourceListPage
      title="Earning rate rules"
      query={query}
      columns={[
        { key: "id", label: "ID" },
        { key: "name", label: "Name" },
      ]}
    />
  );
}
