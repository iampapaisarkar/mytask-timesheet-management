import { useState } from "react";
import { getErrorMessage } from "@mytask/utils";
import { can, getOrganisationAcl } from "@mytask/services";
import {
  holidayCalendarSchema,
  type HolidayCalendarFormValues,
} from "@mytask/validation";
import { useOrganisationStore } from "@/store/organisationStore";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { FormDialog } from "@/components/ui/FormDialog";
import { useToastStore } from "@/store/toastStore";
import { ResourceListPage } from "@/features/shared/ResourceListPage";
import { useAppForm, useValidatedSubmit } from "@/hooks/useAppForm";
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

const emptyHoliday: HolidayCalendarFormValues = { name: "", date: "" };

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

  const form = useAppForm<HolidayCalendarFormValues>({
    schema: holidayCalendarSchema,
    defaultValues: emptyHoliday,
  });
  const {
    register,
    reset,
    formState: { errors },
  } = form;

  function openCreate() {
    setEditing(null);
    reset(emptyHoliday);
    setOpen(true);
  }

  function openEdit(row: Row) {
    if (!canEdit) return;
    setEditing(row);
    reset({
      name: String(row.name || ""),
      date: String(row.date || "").slice(0, 10),
    });
    setOpen(true);
  }

  const handleSave = useValidatedSubmit(form, async (values) => {
    const payload = {
      name: values.name.trim(),
      date: values.date,
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
  });

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
        onSubmit={handleSave}
        loading={createMutation.isPending || updateMutation.isPending}
        submitLabel={editing ? "Update" : "Create"}
      >
        <TextInput
          label="Name"
          error={errors.name?.message}
          {...register("name")}
        />
        <TextInput
          label="Date"
          type="date"
          error={errors.date?.message}
          {...register("date")}
        />
      </FormDialog>
    </>
  );
}
