import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { organisationsApi } from "@mytask/api";
import { queryKeys } from "@mytask/hooks";
import { can, getOrganisationAcl } from "@mytask/services";
import { useOrganisationStore } from "@/store/organisationStore";
import { ResourceListPage, type Row } from "@/features/shared/ResourceListPage";
import { useAwardRates } from "./settingsHooks";
import { AwardRateRulesFormDialog } from "./AwardRateRulesFormDialog";

export function EarningRateRulesPage() {
  const query = useAwardRates();
  const orgCode = useOrganisationStore((s) => s.organisation?.code) || "";
  const role = useOrganisationStore((s) => s.organisation?.role);
  const acl = getOrganisationAcl(role);
  const canCreate = can(acl, "awardRate", "create");
  const canEdit = can(acl, "awardRate", "edit");

  const orgQuery = useQuery({
    queryKey: queryKeys.organisation(orgCode),
    queryFn: async () => {
      const res = await organisationsApi.get(orgCode);
      return res.data.data as Record<string, unknown>;
    },
    enabled: Boolean(orgCode),
    staleTime: 30_000,
  });

  const hasXero = Boolean(orgQuery.data?.xero_connection);

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
        hasXero={hasXero}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
      />
    </>
  );
}
