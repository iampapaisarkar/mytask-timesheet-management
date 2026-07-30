import { usePayrollCalendars } from "./settingsHooks";
import { ResourceListPage } from "@/features/shared/ResourceListPage";

export function PayrollCalendarsPage() {
  const query = usePayrollCalendars();

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">Payroll calendars are read-only.</p>
      <ResourceListPage
        title="Payroll calendars"
        query={query}
        columns={[
          { key: "id", label: "ID" },
          { key: "name", label: "Name" },
          { key: "pay_cycle", label: "Pay cycle", accessor: "pay_cycle.name" },
          { key: "start_date", label: "Start date" },
        ]}
      />
    </div>
  );
}
