import redisUtils from "../utils/redis.utils.js";
import models from "../models/index.js";
const { Users, Employees, UserTimezones } = models;
import { TimesheetConfig } from "../class/timesheet.config.js";
import timsheetService from "../service/timsheet.service.js";

export const resolvers = {
  async timesheetDay({ employeeId, id }, context) {
    const { user, organisation } = context;

    // 1. ACL check
    if (!organisation.acl.timesheetManagement.view) {
      throw new Error(
        "Access denied: You are not authorized to access this action."
      );
    }

    // 2. Validate input
    if (!employeeId) {
      throw new Error("Employee ID required!");
    }
    if (!id) {
      throw new Error("Timesheet day ID required!");
    }

    // 3. Redis cache
    const cacheKey = `timesheet_day:${organisation.id}:${employeeId}:${id}`;
    const cached = await redisUtils.getCache(cacheKey);
    if (cached) return cached;

    // 4. Fetch Employee + Timezone
    const employeeJson = await Employees.unscoped().findOne({
      where: {
        organisation_id: organisation.id,
        id: employeeId,
      },
      include: [
        {
          model: Users,
          as: "user",
          attributes: [
            "id",
            "first_name",
            "middle_name",
            "last_name",
            "full_name",
          ],
          include: [
            {
              model: UserTimezones,
              as: "timezone",
              attributes: ["timezone"],
            },
          ],
        },
      ],
      raw: false,
      nest: true,
    });

    const employee = employeeJson?.toJSON() || null;

    if (!employee) {
      throw new Error("Employee not found!");
    }

    let employeeTimezone = employee?.user?.timezone?.timezone;

    // 5. Prepare where condition
    const whereCondition = {
      organisation_id: organisation.id,
      employee_id: employeeId,
      id: id,
    };

    // 6. Fetch timesheet day
    const response = await timsheetService.getTimesheetDay(
      whereCondition,
      employeeTimezone
    );

    if (!response.success) {
      throw new Error(response?.message || "Unable to fetch timesheet");
    }

    let timesheetDay = response.data;

    // 7. Add permissions like before
    timesheetDay.permissions = await TimesheetConfig.dayTasksPermissions(
      false,
      timesheetDay.status.code
    );

    // 8. Save cache
    await redisUtils.setCache(cacheKey, timesheetDay);

    // 9. Return final object
    return timesheetDay;
  },
};
