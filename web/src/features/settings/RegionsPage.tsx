import { useState } from "react";
import { getErrorMessage } from "@mytask/utils";
import { can, getOrganisationAcl } from "@mytask/services";
import { useOrganisationStore } from "@/store/organisationStore";
import { TextInput } from "@/components/ui/TextInput";
import { FormDialog } from "@/components/ui/FormDialog";
import { useToastStore } from "@/store/toastStore";
import { ResourceListPage } from "@/features/shared/ResourceListPage";
import {
  useCreateRegion,
  useRegions,
  useUpdateRegion,
} from "./settingsHooks";

type Row = Record<string, unknown> & { id?: string | number; name?: string };

export function RegionsPage() {
  const query = useRegions();
  const toast = useToastStore();
  const role = useOrganisationStore((s) => s.organisation?.role);
  const acl = getOrganisationAcl(role);
  const canCreate = can(acl, "region", "create");
  const canEdit = can(acl, "region", "edit");

  const createMutation = useCreateRegion();
  const updateMutation = useUpdateRegion();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [name, setName] = useState("");

  function openCreate() {
    setEditing(null);
    setName("");
    setOpen(true);
  }

  function openEdit(row: Row) {
    if (!canEdit) return;
    setEditing(row);
    setName(String(row.name || ""));
    setOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.warning("Name required");
      return;
    }
    try {
      if (editing?.id != null) {
        await updateMutation.mutateAsync({ id: editing.id, name: name.trim() });
        toast.success("Region updated");
      } else {
        await createMutation.mutateAsync({ name: name.trim() });
        toast.success("Region created");
      }
      setOpen(false);
    } catch (err) {
      toast.error("Save failed", getErrorMessage(err));
    }
  }

  return (
    <>
      <ResourceListPage
        title="Regions"
        query={query}
        columns={[
          { key: "id", label: "ID" },
          { key: "name", label: "Name" },
          { key: "code", label: "Code" },
        ]}
        createLabel={canCreate ? "Create region" : undefined}
        onCreate={canCreate ? openCreate : undefined}
        onRowClick={canEdit ? (row) => openEdit(row as Row) : undefined}
      />
      <FormDialog
        open={open}
        title={editing ? "Edit region" : "Create region"}
        onClose={() => setOpen(false)}
        onSubmit={() => void handleSave()}
        loading={createMutation.isPending || updateMutation.isPending}
      >
        <TextInput
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </FormDialog>
    </>
  );
}
