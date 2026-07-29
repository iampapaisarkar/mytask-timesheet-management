import { useHolidayCalendars } from "./settingsHooks";
import { ResourceListPage } from "@/features/shared/ResourceListPage";

export function HolidayCalendarsPage() {
  const query = useHolidayCalendars();
  return (
    <ResourceListPage
      title="Holiday calendars"
      query={query}
      columns={[
        { key: "id", label: "ID" },
        { key: "name", label: "Name" },
      ]}
    />
  );
}
