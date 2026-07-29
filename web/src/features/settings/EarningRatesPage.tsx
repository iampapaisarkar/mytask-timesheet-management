import { useState } from "react";
import { getErrorMessage } from "@mytask/utils";
import { can, getOrganisationAcl } from "@mytask/services";
import { useOrganisationStore } from "@/store/organisationStore";
import { TextInput } from "@/components/ui/TextInput";
import { FormDialog } from "@/components/ui/FormDialog";
import { useToastStore } from "@/store/toastStore";
import { ResourceListPage } from "@/features/shared/ResourceListPage";
import {
  useCreateEarningRate,
  useEarningRates,
  useUpdateEarningRate,
} from "./settingsHooks";

type Row = Record<string, unknown> & {
  id?: string | number;
  name?: string;
  rate?: string | number;
};

export function EarningRatesPage() {
  const query = useEarningRates();
  const toast = useToastStore();
  const role = useOrganisationStore((s) => s.organisation?.role);
  const acl = getOrganisationAcl(role);
  const canCreate = can(acl, "earningRate", "create");
  const canEdit = can(acl, "earningRate", "edit");

  const createMutation = useCreateEarningRate();
  const updateMutation = useUpdateEarningRate();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");
  const [pushToXero, setPushToXero] = useState(false);

  function openCreate() {
    setEditing(null);
    setName("");
    setRate("");
    setPushToXero(false);
    setOpen(true);
  }

  function openEdit(row: Row) {
    if (!canEdit) return;
    setEditing(row);
    setName(String(row.name || ""));
    setRate(String(row.rate ?? ""));
    setPushToXero(false);
    setOpen(true);
  }

  async function handleSave() {
    if (!name.trim() || rate === "") {
      toast.warning("Name and rate are required");
      return;
    }
    const payload = {
      name: name.trim(),
      rate: Number(rate),
      push_to_xero: pushToXero,
    };
    try {
      if (editing?.id != null) {
        await updateMutation.mutateAsync({ id: editing.id, ...payload });
        toast.success("Earning rate updated");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Earning rate created");
      }
      setOpen(false);
    } catch (err) {
      toast.error("Save failed", getErrorMessage(err));
    }
  }

  return (
    <>
      <ResourceListPage
        title="Earning rates"
        query={query}
        columns={[
          { key: "id", label: "ID" },
          { key: "name", label: "Name" },
          { key: "rate", label: "Rate" },
        ]}
        createLabel={canCreate ? "Create rate" : undefined}
        onCreate={canCreate ? openCreate : undefined}
        onRowClick={canEdit ? (row) => openEdit(row as Row) : undefined}
      />
      <FormDialog
        open={open}
        title={editing ? "Edit earning rate" : "Create earning rate"}
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
          label="Rate"
          type="number"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={pushToXero}
            onChange={(e) => setPushToXero(e.target.checked)}
          />
          Push to Xero
        </label>
      </FormDialog>
    </>
  );
}
