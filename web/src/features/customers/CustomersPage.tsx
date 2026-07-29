import { useCustomers } from "@mytask/hooks";
import { ResourceListPage } from "@/features/shared/ResourceListPage";

export function CustomersPage() {
  const query = useCustomers();
  return (
    <ResourceListPage
      title="Customers"
      query={query}
      createLabel="Create"
      columns={[
        { key: "id", label: "ID" },
        { key: "name", label: "Name" },
        { key: "contact_email", label: "Contact Email" },
      ]}
    />
  );
}
