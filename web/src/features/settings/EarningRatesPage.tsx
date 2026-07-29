import { useEarningRates } from "./settingsHooks";
import { ResourceListPage } from "@/features/shared/ResourceListPage";

export function EarningRatesPage() {
  const query = useEarningRates();
  return (
    <ResourceListPage
      title="Earning rates"
      query={query}
      columns={[
        { key: "id", label: "ID" },
        { key: "name", label: "Name" },
        { key: "rate", label: "Rate" },
      ]}
    />
  );
}
