import { useTimesheets } from "@mytask/hooks";
import { ROUTES } from "@mytask/constants";
import { ResourceListPage } from "@/features/shared/ResourceListPage";

export function TimesheetListPage() {
  const query = useTimesheets({ rows_per_page: 50, sort_by: "id" });
  return (
    <ResourceListPage
      title="My Timesheets"
      query={query}
      columns={[
        { key: "id", label: "ID" },
        { key: "code", label: "Code" },
        { key: "period_range", label: "Period" },
        { key: "status", label: "Status", accessor: "status.name" },
      ]}
      detailPath={ROUTES.timesheetDetails}
    />
  );
}
