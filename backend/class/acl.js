export const Acl = {
  organisationAcl: async (role) => {
    const rolePermissions = {
      owner: {
        organisationSetting: createPermissions(false, true, false, true, false),
        timesheet: createPermissions(false, false, false, false, false),
        timesheetManagement: createPermissions(true, true, true, true, false),
        report: createPermissions(true, true, false, false, false),
        employee: createPermissions(true, false, true, true, false),
        customer: createPermissions(true, false, true, true, false),
        managementGroup: createPermissions(true, false, true, true, false),
        job: createPermissions(true, false, true, true, false),
        region: createPermissions(true, false, true, true, false),
        holidayCalendar: createPermissions(true, false, true, true, false),
        payrollCalendar: createPermissions(true, false, true, false, false),
        earningRate: createPermissions(true, false, true, true, false),
        awardRate: createPermissions(true, false, true, true, false),
        setting: createPermissions(true, false, false, false, false),
        xero: createPermissions(true, true, true, true, false),
      },
      moderator: {
        organisationSetting: createPermissions(
          false,
          true,
          false,
          false,
          false
        ),
        timesheet: createPermissions(true, true, false, true, false),
        timesheetManagement: createPermissions(true, true, true, true, false),
        report: createPermissions(true, true, false, false, false),
        employee: createPermissions(true, false, true, true, false),
        customer: createPermissions(true, false, true, true, false),
        managementGroup: createPermissions(true, false, true, true, false),
        job: createPermissions(true, false, true, true, false),
        region: createPermissions(true, false, true, true, false),
        holidayCalendar: createPermissions(true, false, true, true, false),
        payrollCalendar: createPermissions(true, false, true, false, false),
        earningRate: createPermissions(true, false, true, true, false),
        awardRate: createPermissions(true, false, true, true, false),
        setting: createPermissions(true, false, false, false, false),
        xero: createPermissions(false, false, false, false, false),
      },
      manager: {
        organisationSetting: createPermissions(
          false,
          false,
          false,
          false,
          false
        ),
        timesheet: createPermissions(true, true, false, true, false),
        timesheetManagement: createPermissions(true, true, true, true, false),
        report: createPermissions(true, true, false, false, false),
        employee: createPermissions(false, false, false, false, false),
        customer: createPermissions(false, false, false, false, false),
        managementGroup: createPermissions(true, false, false, false, false),
        job: createPermissions(true, false, true, true, false),
        region: createPermissions(false, false, false, false, false),
        holidayCalendar: createPermissions(false, false, false, false, false),
        payrollCalendar: createPermissions(false, false, false, false, false),
        earningRate: createPermissions(false, false, false, false, false),
        awardRate: createPermissions(false, false, false, false, false),
        setting: createPermissions(false, false, false, false, false),
        xero: createPermissions(false, false, false, false, false),
      },
      staff: {
        organisationSetting: createPermissions(
          false,
          false,
          false,
          false,
          false
        ),
        timesheet: createPermissions(true, true, false, true, false),
        timesheetManagement: createPermissions(
          false,
          false,
          false,
          false,
          false
        ),
        report: createPermissions(true, true, false, false, false),
        employee: createPermissions(false, false, false, false, false),
        customer: createPermissions(false, false, false, false, false),
        managementGroup: createPermissions(true, false, false, false, false),
        job: createPermissions(true, false, false, false, false),
        region: createPermissions(false, false, false, false, false),
        holidayCalendar: createPermissions(false, false, false, false, false),
        payrollCalendar: createPermissions(false, false, false, false, false),
        earningRate: createPermissions(false, false, false, false, false),
        awardRate: createPermissions(false, false, false, false, false),
        setting: createPermissions(false, false, false, false, false),
        xero: createPermissions(false, false, false, false, false),
      },
    };

    return (
      rolePermissions[role] || {
        organisationSetting: createPermissions(),
        timesheet: createPermissions(),
        timesheetManagement: createPermissions(),
        employee: createPermissions(),
        customer: createPermissions(),
        managementGroup: createPermissions(),
        job: createPermissions(),
        setting: {
          view: false,
          region: createPermissions(),
          holidayCalendar: createPermissions(),
          payrollCalendar: createPermissions(),
          earningRate: createPermissions(),
          awardRate: createPermissions(),
        },
        xero: createPermissions(),
      }
    );
  },
};

const createPermissions = (
  list = false,
  view = false,
  create = false,
  edit = false,
  del = false
) => ({ list, view, create, edit, delete: del });
