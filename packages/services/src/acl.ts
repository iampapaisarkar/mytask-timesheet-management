import type {
  CrudPermission,
  OrganisationAcl,
  OrganisationRoleCode,
} from "@mytask/types";

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

/** Mirrors backend/class/acl.js organisationAcl — organisation roles only. */
export function getOrganisationAcl(
  role: OrganisationRoleCode | string | undefined | null,
): OrganisationAcl {
  const rolePermissions: Record<string, OrganisationAcl> = {
    owner: {
      organisationSetting: perms(false, true, false, true, false),
      timesheet: perms(true, true, false, true, false),
      timesheetManagement: perms(true, true, true, true, false),
      report: perms(true, true, true, false, false),
      employee: perms(true, true, true, true, false),
      customer: perms(true, true, true, true, true),
      job: perms(true, true, true, true, true),
      holidayCalendar: perms(true, false, true, true, false),
      payrollCalendar: perms(true, true, true, false, false),
      setting: perms(true, false, false, false, false),
      payout: perms(true, true, true, true, false),
    },
    moderator: {
      organisationSetting: perms(false, true, false, false, false),
      timesheet: perms(true, true, false, true, false),
      timesheetManagement: perms(true, true, true, true, false),
      report: perms(true, true, true, false, false),
      employee: perms(true, true, true, true, false),
      customer: perms(true, true, true, true, false),
      job: perms(true, true, true, true, false),
      holidayCalendar: perms(true, false, true, true, false),
      payrollCalendar: perms(true, true, true, false, false),
      setting: perms(true, false, false, false, false),
      payout: none(),
    },
    manager: {
      organisationSetting: none(),
      timesheet: perms(true, true, false, true, false),
      timesheetManagement: perms(true, true, true, true, false),
      report: perms(true, true, true, false, false),
      employee: perms(true, true, true, true, false),
      customer: none(),
      job: none(),
      holidayCalendar: none(),
      payrollCalendar: none(),
      setting: none(),
      payout: none(),
    },
    staff: {
      organisationSetting: none(),
      timesheet: perms(true, true, false, true, false),
      timesheetManagement: none(),
      report: perms(true, true, true, false, false),
      employee: none(),
      customer: none(),
      job: none(),
      holidayCalendar: none(),
      payrollCalendar: none(),
      setting: none(),
      payout: none(),
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
      job: none(),
      holidayCalendar: none(),
      payrollCalendar: none(),
      setting: none(),
      payout: none(),
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
