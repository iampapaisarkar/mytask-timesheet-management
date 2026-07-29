import { useTimesheets } from "@mytask/hooks";
import { ROUTES } from "@mytask/constants";
import { ResourceListPage } from "@/features/shared/ResourceListPage";

export function TimesheetListPage() {
  const query = useTimesheets();
  return (
    <ResourceListPage
      title="My Timesheets"
      query={query}
      columns={[
        { key: "id", label: "ID" },
        { key: "period", label: "Period" },
        { key: "status", label: "Status" },
      ]}
      detailPath={ROUTES.timesheetDetails}
    />
  );
}
