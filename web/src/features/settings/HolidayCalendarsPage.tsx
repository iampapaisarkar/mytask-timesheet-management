import { useState } from "react";
import { getErrorMessage } from "@mytask/utils";
import { can, getOrganisationAcl } from "@mytask/services";
import { useOrganisationStore } from "@/store/organisationStore";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { FormDialog } from "@/components/ui/FormDialog";
import { useToastStore } from "@/store/toastStore";
import { ResourceListPage } from "@/features/shared/ResourceListPage";
import {
  useCreateHolidayCalendar,
  useHolidayCalendars,
  useUpdateHolidayCalendar,
} from "./settingsHooks";

type Row = Record<string, unknown> & {
  id?: string | number;
  name?: string;
  date?: string;
};

export function HolidayCalendarsPage() {
  const [page, setPage] = useState(1);
  const query = useHolidayCalendars({ page_number: page });
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


  function openCreate() {
    setEditing(null);
    setName("");
    setDate("");
    setOpen(true);
  }

  function openEdit(row: Row) {
    if (!canEdit) return;
    setEditing(row);
    setName(String(row.name || ""));
    setDate(String(row.date || "").slice(0, 10));
    setOpen(true);
  }

  async function handleSave() {
    if (!name.trim() || !date) {
      toast.warning("Name and date are required");
      return;
    }
    const payload = {
      name: name.trim(),
      date,
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
        page={page}
        onPageChange={setPage}
        columns={[
          { key: "id", label: "ID" },
          { key: "name", label: "Name" },
          { key: "date", label: "Date" },
        ]}
        createLabel={canCreate ? "Create holiday" : undefined}
        onCreate={canCreate ? openCreate : undefined}
        onRowClick={canEdit ? (row) => openEdit(row as Row) : undefined}
        rowActions={
          canEdit
            ? (row) => (
                <Button
                  variant="soft"
                  className="px-2.5 py-1.5 text-xs"
                  onClick={() => openEdit(row as Row)}
                >
                  Edit
                </Button>
              )
            : undefined
        }
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
      </FormDialog>
    </>
  );
}
