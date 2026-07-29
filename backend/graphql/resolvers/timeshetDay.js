import redisUtils from "../../utils/redis.utils.js";
import models from "../../models/index.js";
const { Users, Employees, UserTimezones } = models;
import { TimesheetConfig } from "../../class/timesheet.config.js";
import timsheetService from "../../service/timsheet.service.js";

export const resolvers = {
  async timesheetDay({ employeeId, id, type: requestType }, context) {
    const { user, organisation } = context;

    if (requestType === "others") {
      try {
        // 1. ACL check
        if (!organisation.acl.timesheetManagement.view) {
          return {
            success: false,
            code: 403,
            message:
              "Access denied: You are not authorized to access this action.",
          };
        }

        // 2. Validate input
        if (!employeeId) {
          return {
            success: false,
            code: 403,
            message: "Employee ID required!",
          };
        }
        if (!id) {
          return {
            success: false,
            code: 403,
            message: "Timesheet day ID required!",
          };
        }

        // 3. Redis cache
        const cacheKey = `timesheet_day:${organisation.id}:${employeeId}:${id}`;
        const cached = await redisUtils.getCache(cacheKey);
        if (cached)
          return {
            success: true,
            code: 200,
            data: cached,
          };

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
          return {
            success: false,
            code: 500,
            data: "Employee not found!",
          };
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
          return {
            success: false,
            code: 500,
            data: "Unable to fetch timesheet",
          };
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
        return {
          success: true,
          code: 200,
          data: timesheetDay,
        };
      } catch (err) {
        console.error("Error fetching timsheet:", err);
        return {
          success: true,
          code: 200,
          data: err.message,
        };
      }
    } else if (requestType === "self") {
      if (!organisation.acl.timesheet.view) {
        return {
          success: false,
          code: 403,
          message:
            "Access denied: You are not authorized to access this action.",
        };
      }
      try {
        const cacheKey = `timesheet_day:${organisation.id}:${organisation?.employee?.id}:${id}`;
        const cached = await redisUtils.getCache(cacheKey);
        if (cached)
          return {
            success: true,
            code: 200,
            data: cached,
          };

        let whereCondition = {
          organisation_id: organisation.id,
          employee_id: organisation?.employee?.id,
          id: id,
        };

        let employeeTimezone = user?.timezone?.timezone;

        const response = await timsheetService.getTimesheetDay(
          whereCondition,
          employeeTimezone
        );

        if (!response.success) {
          return {
            success: false,
            code: response?.code || 500,
            data: response?.message || null,
          };
        }
        let timesheetDay = response?.data;

        timesheetDay.permissions = await TimesheetConfig.dayTasksPermissions(
          false,
          timesheetDay.status.code
        );

        await redisUtils.setCache(cacheKey, timesheetDay);

        return {
          success: true,
          code: 200,
          data: timesheetDay,
        };
      } catch (err) {
        console.error("Error fetching timsheet:", err);
        return {
          success: true,
          code: 200,
          data: err.message,
        };
      }
    }
  },
};
