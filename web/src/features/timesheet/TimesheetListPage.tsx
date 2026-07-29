import { useTimesheets } from "@mysheet/hooks";
import { ROUTES } from "@mysheet/constants";
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
