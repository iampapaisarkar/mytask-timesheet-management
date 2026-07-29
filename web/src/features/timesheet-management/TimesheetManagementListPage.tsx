import { useState } from "react";
import { useTimesheetManagement } from "@mytask/hooks";
import { ROUTES } from "@mytask/constants";
import { ResourceListPage } from "@/features/shared/ResourceListPage";
import { CreateTimesheetDialog } from "./CreateTimesheetDialog";

export function TimesheetManagementListPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const query = useTimesheetManagement({ rows_per_page: 50, sort_by: "id" });
  return (
    <>
      <ResourceListPage
        title="Timesheets"
        query={query}
        createLabel="Create"
        onCreate={() => setCreateOpen(true)}
        columns={[
          { key: "id", label: "ID" },
          {
            key: "employee",
            label: "Employee",
            accessor: (row) =>
              (row.employee as { user?: { full_name?: string } } | undefined)
                ?.user?.full_name,
          },
          { key: "period_range", label: "Period" },
          { key: "status", label: "Status", accessor: "status.name" },
        ]}
        detailPath={ROUTES.timesheetManagementDetails}
      />
      <CreateTimesheetDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </>
  );
}
