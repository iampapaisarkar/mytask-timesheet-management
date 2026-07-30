export const Acl = {
  organisationAcl: async (role) => {
    const rolePermissions = {
      owner: {
        organisationSetting: createPermissions(false, true, false, true, false),
        timesheet: createPermissions(true, true, false, true, false),
        timesheetManagement: createPermissions(true, true, true, true, false),
        report: createPermissions(true, true, false, false, false),
        employee: createPermissions(true, true, true, true, false),
        customer: createPermissions(true, true, true, true, true),
        job: createPermissions(true, true, true, true, true),
        holidayCalendar: createPermissions(true, false, true, true, false),
        payrollCalendar: createPermissions(true, false, true, false, false),
        setting: createPermissions(true, false, false, false, false),
        payout: createPermissions(true, true, true, true, false),
      },
      moderator: {
        organisationSetting: createPermissions(
          false,
          true,
          false,
          false,
          false,
        ),
        timesheet: createPermissions(true, true, false, true, false),
        timesheetManagement: createPermissions(true, true, true, true, false),
        report: createPermissions(true, true, false, false, false),
        employee: createPermissions(true, true, true, true, false),
        customer: createPermissions(true, true, true, true, false),
        job: createPermissions(true, true, true, true, false),
        holidayCalendar: createPermissions(true, false, true, true, false),
        payrollCalendar: createPermissions(true, false, true, false, false),
        setting: createPermissions(true, false, false, false, false),
        payout: createPermissions(false, false, false, false, false),
      },
      manager: {
        organisationSetting: createPermissions(
          false,
          false,
          false,
          false,
          false,
        ),
        timesheet: createPermissions(true, true, false, true, false),
        timesheetManagement: createPermissions(true, true, true, true, false),
        report: createPermissions(true, true, false, false, false),
        employee: createPermissions(true, true, true, true, false),
        customer: createPermissions(false, false, false, false, false),
        job: createPermissions(false, false, false, false, false),
        holidayCalendar: createPermissions(false, false, false, false, false),
        payrollCalendar: createPermissions(false, false, false, false, false),
        setting: createPermissions(false, false, false, false, false),
        payout: createPermissions(false, false, false, false, false),
      },
      staff: {
        organisationSetting: createPermissions(
          false,
          false,
          false,
          false,
          false,
        ),
        timesheet: createPermissions(true, true, false, true, false),
        timesheetManagement: createPermissions(
          false,
          false,
          false,
          false,
          false,
        ),
        report: createPermissions(true, true, false, false, false),
        employee: createPermissions(false, false, false, false, false),
        customer: createPermissions(false, false, false, false, false),
        job: createPermissions(false, false, false, false, false),
        holidayCalendar: createPermissions(false, false, false, false, false),
        payrollCalendar: createPermissions(false, false, false, false, false),
        setting: createPermissions(false, false, false, false, false),
        payout: createPermissions(false, false, false, false, false),
      },
    };

    return (
      rolePermissions[role] || {
        organisationSetting: createPermissions(),
        timesheet: createPermissions(),
        timesheetManagement: createPermissions(),
        report: createPermissions(),
        employee: createPermissions(),
        customer: createPermissions(),
        job: createPermissions(),
        holidayCalendar: createPermissions(),
        payrollCalendar: createPermissions(),
        setting: createPermissions(),
        payout: createPermissions(),
      }
    );
  },
};

function createPermissions(
  list = false,
  view = false,
  create = false,
  edit = false,
  del = false,
) {
  return {
    list: list,
    view: view,
    create: create,
    edit: edit,
    delete: del,
  };
}

export default Acl;
