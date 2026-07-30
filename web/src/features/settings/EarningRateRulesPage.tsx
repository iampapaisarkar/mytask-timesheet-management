import { useState } from "react";
import { can, getOrganisationAcl } from "@mytask/services";
import { useOrganisationStore } from "@/store/organisationStore";
import { ResourceListPage, type Row } from "@/features/shared/ResourceListPage";
import { useAwardRates } from "./settingsHooks";
import { AwardRateRulesFormDialog } from "./AwardRateRulesFormDialog";

export function EarningRateRulesPage() {
  const query = useAwardRates();
  const role = useOrganisationStore((s) => s.organisation?.role);
  const acl = getOrganisationAcl(role);
  const canCreate = can(acl, "awardRate", "create");
  const canEdit = can(acl, "awardRate", "edit");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(row: Row) {
    if (!canEdit) return;
    setEditing(row);
    setOpen(true);
  }

  return (
    <>
      <ResourceListPage
        title="Earning Rate Rules"
        query={query}
        columns={[{ key: "name", label: "Name" }]}
        createLabel={canCreate ? "Create" : undefined}
        onCreate={canCreate ? openCreate : undefined}
        onRowClick={canEdit ? openEdit : undefined}
      />
      <AwardRateRulesFormDialog
        open={open}
        awardRate={editing}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
      />
    </>
  );
}
