import { useEmployees } from "@mytask/hooks";
import { ResourceListPage } from "@/features/shared/ResourceListPage";

export function EmployeesPage() {
  const query = useEmployees({ rows_per_page: 50, sort_by: "id" });
  return (
    <ResourceListPage
      title="Employees"
      query={query}
      columns={[
        {
          key: "id",
          label: "ID",
          accessor: (row) =>
            (row.details as { id?: number } | undefined)?.id ?? row.id,
        },
        {
          key: "name",
          label: "Name",
          accessor: (row) =>
            (row.details as { full_name?: string } | undefined)?.full_name,
        },
        {
          key: "email",
          label: "Email",
          accessor: (row) =>
            (row.details as { email?: string } | undefined)?.email,
        },
        {
          key: "role",
          label: "Role",
          accessor: (row) =>
            (row.details as { role?: { name?: string } } | undefined)?.role
              ?.name,
        },
        {
          key: "phone",
          label: "Phone",
          accessor: (row) =>
            (row.details as { phone_number?: string } | undefined)
              ?.phone_number,
        },
      ]}
    />
  );
}
