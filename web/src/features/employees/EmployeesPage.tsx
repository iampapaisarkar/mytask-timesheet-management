import { useEmployees } from "@mytask/hooks";
import { ResourceListPage } from "@/features/shared/ResourceListPage";

export function EmployeesPage() {
  const query = useEmployees();
  return (
    <ResourceListPage
      title="Employees"
      query={query}
      createLabel="Create"
      columns={[
        { key: "id", label: "ID" },
        { key: "first_name", label: "First Name" },
        { key: "last_name", label: "Last Name" },
        { key: "email", label: "Email" },
      ]}
    />
  );
}
