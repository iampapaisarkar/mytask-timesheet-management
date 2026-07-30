export const REPORT_ROLE_LADDER = {
  owner: null as null,
  moderator: ["manager", "staff"] as string[],
  manager: ["staff"] as string[],
  staff: [] as string[],
};

export type ReportRequesterRole = keyof typeof REPORT_ROLE_LADDER;

export type ReportEmployeeRoleRow = {
  id: number;
  roleCode?: string | null;
};

export function allowedReportTargetRoles(
  requesterRole: string | null | undefined,
): string[] | null {
  if (!requesterRole || !(requesterRole in REPORT_ROLE_LADDER)) {
    return [];
  }
  return REPORT_ROLE_LADDER[requesterRole as ReportRequesterRole];
}

export function filterEmployeesByReportLadder(
  employeesWithRoles: ReportEmployeeRoleRow[],
  requesterRole: string | null | undefined,
  selfEmployeeId: number | string | null | undefined,
): ReportEmployeeRoleRow[] {
  const allowed = allowedReportTargetRoles(requesterRole);
  if (allowed === null) return employeesWithRoles;
  const selfId = selfEmployeeId != null ? Number(selfEmployeeId) : null;
  return employeesWithRoles.filter((emp) => {
    if (selfId != null && Number(emp.id) === selfId) return true;
    if (!emp.roleCode) return false;
    return allowed.includes(emp.roleCode);
  });
}
