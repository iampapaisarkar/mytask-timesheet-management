import type {
  CrudPermission,
  OrganisationAcl,
  OrganisationRoleCode,
} from "@mysheet/types";

const none = (): CrudPermission => ({
  list: false,
  view: false,
  create: false,
  edit: false,
  delete: false,
});

const perms = (
  list = false,
  view = false,
  create = false,
  edit = false,
  del = false,
): CrudPermission => ({ list, view, create, edit, delete: del });

/** Mirrors backend/class/acl.js organisationAcl */
export function getOrganisationAcl(
  role: OrganisationRoleCode | string | undefined | null,
): OrganisationAcl {
  const rolePermissions: Record<string, OrganisationAcl> = {
    owner: {
      organisationSetting: perms(false, true, false, true, false),
      timesheet: none(),
      timesheetManagement: perms(true, true, true, true, false),
      report: perms(true, true, false, false, false),
      employee: perms(true, false, true, true, false),
      customer: perms(true, false, true, true, false),
      managementGroup: perms(true, false, true, true, false),
      job: perms(true, false, true, true, false),
      region: perms(true, false, true, true, false),
      holidayCalendar: perms(true, false, true, true, false),
      payrollCalendar: perms(true, false, true, false, false),
      earningRate: perms(true, false, true, true, false),
      awardRate: perms(true, false, true, true, false),
      setting: perms(true, false, false, false, false),
      xero: perms(true, true, true, true, false),
    },
    moderator: {
      organisationSetting: perms(false, true, false, false, false),
      timesheet: perms(true, true, false, true, false),
      timesheetManagement: perms(true, true, true, true, false),
      report: perms(true, true, false, false, false),
      employee: perms(true, false, true, true, false),
      customer: perms(true, false, true, true, false),
      managementGroup: perms(true, false, true, true, false),
      job: perms(true, false, true, true, false),
      region: perms(true, false, true, true, false),
      holidayCalendar: perms(true, false, true, true, false),
      payrollCalendar: perms(true, false, true, false, false),
      earningRate: perms(true, false, true, true, false),
      awardRate: perms(true, false, true, true, false),
      setting: perms(true, false, false, false, false),
      xero: none(),
    },
    manager: {
      organisationSetting: none(),
      timesheet: perms(true, true, false, true, false),
      timesheetManagement: perms(true, true, true, true, false),
      report: perms(true, true, false, false, false),
      employee: none(),
      customer: none(),
      managementGroup: perms(true, false, false, false, false),
      job: perms(true, false, true, true, false),
      region: none(),
      holidayCalendar: none(),
      payrollCalendar: none(),
      earningRate: none(),
      awardRate: none(),
      setting: none(),
      xero: none(),
    },
    staff: {
      organisationSetting: none(),
      timesheet: perms(true, true, false, true, false),
      timesheetManagement: none(),
      report: perms(true, true, false, false, false),
      employee: none(),
      customer: none(),
      managementGroup: perms(true, false, false, false, false),
      job: perms(true, false, false, false, false),
      region: none(),
      holidayCalendar: none(),
      payrollCalendar: none(),
      earningRate: none(),
      awardRate: none(),
      setting: none(),
      xero: none(),
    },
  };

  return (
    rolePermissions[role || ""] || {
      organisationSetting: none(),
      timesheet: none(),
      timesheetManagement: none(),
      report: none(),
      employee: none(),
      customer: none(),
      managementGroup: none(),
      job: none(),
      region: none(),
      holidayCalendar: none(),
      payrollCalendar: none(),
      earningRate: none(),
      awardRate: none(),
      setting: none(),
      xero: none(),
    }
  );
}

export function can(
  acl: OrganisationAcl,
  action: keyof OrganisationAcl,
  permission: keyof CrudPermission,
): boolean {
  return Boolean(acl[action]?.[permission]);
}
