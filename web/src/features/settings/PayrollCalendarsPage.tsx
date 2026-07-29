import { usePayrollCalendars } from "./settingsHooks";
import { ResourceListPage } from "@/features/shared/ResourceListPage";

export function PayrollCalendarsPage() {
  const query = usePayrollCalendars();
  return (
    <ResourceListPage
      title="Payroll calendars"
      query={query}
      columns={[
        { key: "id", label: "ID" },
        { key: "name", label: "Name" },
        { key: "calendar_type", label: "Type" },
      ]}
    />
  );
}
