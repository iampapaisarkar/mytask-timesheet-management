import { useTimesheetManagement } from "@mytask/hooks";
import { ROUTES } from "@mytask/constants";
import { ResourceListPage } from "@/features/shared/ResourceListPage";

export function TimesheetManagementListPage() {
  const query = useTimesheetManagement();
  return (
    <ResourceListPage
      title="Timesheets"
      query={query}
      createLabel="Create"
      columns={[
        { key: "id", label: "ID" },
        { key: "employee", label: "Employee" },
        { key: "period", label: "Period" },
        { key: "status", label: "Status" },
      ]}
      detailPath={ROUTES.timesheetManagementDetails}
    />
  );
}
