import { useState } from "react";
import { getErrorMessage } from "@mytask/utils";
import { can, getOrganisationAcl } from "@mytask/services";
import { useOrganisationStore } from "@/store/organisationStore";
import { TextInput } from "@/components/ui/TextInput";
import { FormDialog } from "@/components/ui/FormDialog";
import { useToastStore } from "@/store/toastStore";
import { ResourceListPage } from "@/features/shared/ResourceListPage";
import {
  useCreateHolidayCalendar,
  useHolidayCalendars,
  useRegions,
  useUpdateHolidayCalendar,
} from "./settingsHooks";

type Row = Record<string, unknown> & {
  id?: string | number;
  name?: string;
  date?: string;
  region?: { id?: number; name?: string };
};

export function HolidayCalendarsPage() {
  const query = useHolidayCalendars();
  const regionsQuery = useRegions();
  const toast = useToastStore();
  const role = useOrganisationStore((s) => s.organisation?.role);
  const acl = getOrganisationAcl(role);
  const canCreate = can(acl, "holidayCalendar", "create");
  const canEdit = can(acl, "holidayCalendar", "edit");

  const createMutation = useCreateHolidayCalendar();
  const updateMutation = useUpdateHolidayCalendar();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [regionId, setRegionId] = useState("");

  const regions = (regionsQuery.data || []) as Array<{
    id: number;
    name: string;
  }>;

  function openCreate() {
    setEditing(null);
    setName("");
    setDate("");
    setRegionId("");
    setOpen(true);
  }

  function openEdit(row: Row) {
    if (!canEdit) return;
    setEditing(row);
    setName(String(row.name || ""));
    setDate(String(row.date || "").slice(0, 10));
    setRegionId(String(row.region?.id || ""));
    setOpen(true);
  }

  async function handleSave() {
    if (!name.trim() || !date || !regionId) {
      toast.warning("Name, date, and region are required");
      return;
    }
    const payload = {
      name: name.trim(),
      date,
      region: { id: Number(regionId) },
    };
    try {
      if (editing?.id != null) {
        await updateMutation.mutateAsync({ id: editing.id, ...payload });
        toast.success("Holiday updated");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Holiday created");
      }
      setOpen(false);
    } catch (err) {
      toast.error("Save failed", getErrorMessage(err));
    }
  }

  return (
    <>
      <ResourceListPage
        title="Holiday calendars"
        query={query}
        columns={[
          { key: "id", label: "ID" },
          { key: "name", label: "Name" },
          { key: "date", label: "Date" },
          { key: "region", label: "Region", accessor: "region.name" },
        ]}
        createLabel={canCreate ? "Create holiday" : undefined}
        onCreate={canCreate ? openCreate : undefined}
        onRowClick={canEdit ? (row) => openEdit(row as Row) : undefined}
      />
      <FormDialog
        open={open}
        title={editing ? "Edit holiday" : "Create holiday"}
        onClose={() => setOpen(false)}
        onSubmit={() => void handleSave()}
        loading={createMutation.isPending || updateMutation.isPending}
      >
        <TextInput
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextInput
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-muted">Region</span>
          <select
            className="rounded-xl border border-border bg-[var(--mt-surface)] px-3 py-2.5"
            value={regionId}
            onChange={(e) => setRegionId(e.target.value)}
          >
            <option value="">Select region</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
      </FormDialog>
    </>
  );
}
