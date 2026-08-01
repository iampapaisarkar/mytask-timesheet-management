import { useMemo } from "react";
import { can, getOrganisationAcl } from "@mytask/services";
import type { CrudPermission, OrganisationAcl } from "@mytask/types";
import { useOrganisationStore } from "../store/organisationStore";

/**
 * Organisation ACL for the active membership — same source as web.
 */
export function useOrgAcl() {
  const organisation = useOrganisationStore((s) => s.organisation);
  const role = organisation?.role || organisation?.role_code;
  const acl = useMemo(() => getOrganisationAcl(role), [role]);

  return {
    organisation,
    role,
    acl,
    can: (action: keyof OrganisationAcl, permission: keyof CrudPermission) =>
      can(acl, action, permission),
  };
}
