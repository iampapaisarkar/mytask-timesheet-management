import { useState } from "react";
import { getErrorMessage } from "@mytask/utils";
import { can, getOrganisationAcl } from "@mytask/services";
import { useOrganisationStore } from "@/store/organisationStore";
import { TextInput } from "@/components/ui/TextInput";
import { FormDialog } from "@/components/ui/FormDialog";
import { useToastStore } from "@/store/toastStore";
import { ResourceListPage } from "@/features/shared/ResourceListPage";
import { useAwardRates, useCreateAwardRate } from "./settingsHooks";

/**
 * Simplified award-rate (earning rate rules) create.
 * Full IF/THEN rule builder can expand later; Vue stored complex nested settings/rules.
 * This creates a named award rate with minimal ordinary-hours settings so the list is usable.
 */
export function EarningRateRulesPage() {
  const query = useAwardRates();
  const toast = useToastStore();
  const role = useOrganisationStore((s) => s.organisation?.role);
  const acl = getOrganisationAcl(role);
  const canCreate = can(acl, "awardRate", "create");
  const createMutation = useCreateAwardRate();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  async function handleSave() {
    if (!name.trim()) {
      toast.warning("Name required");
      return;
    }
    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        settings: {
          ordinary_hours: 7.6,
          rounding_interval: { id: 1 },
        },
        rules: [],
        earning_rates: [],
        push_to_xero: false,
      });
      toast.success("Earning rate rule created");
      setOpen(false);
      setName("");
    } catch (err) {
      toast.error("Create failed", getErrorMessage(err));
    }
  }

  return (
    <>
      <ResourceListPage
        title="Earning rate rules"
        query={query}
        columns={[
          { key: "id", label: "ID" },
          { key: "name", label: "Name" },
        ]}
        createLabel={canCreate ? "Create rule set" : undefined}
        onCreate={
          canCreate
            ? () => {
                setName("");
                setOpen(true);
              }
            : undefined
        }
      />
      <FormDialog
        open={open}
        title="Create earning rate rules"
        onClose={() => setOpen(false)}
        onSubmit={() => void handleSave()}
        loading={createMutation.isPending}
        submitLabel="Create"
      >
        <TextInput
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <p className="text-xs text-muted">
          Creates an award-rate container with default ordinary hours. Detailed
          IF/THEN rules can be refined to match the full Vue rule builder.
        </p>
      </FormDialog>
    </>
  );
}
