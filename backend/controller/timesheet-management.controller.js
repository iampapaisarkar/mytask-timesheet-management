import { fn, col, literal, Op } from "sequelize";
import models from "../models/index.js";
const {
  Users,
  Employees,
  Timesheets,
  TimesheetDays,
  TimesheetStatus,
  ManagementGroupEmployees,
  UserTimezones,
} = models;
import moment from "moment-timezone";
import { TimesheetConfig } from "../class/timesheet.config.js";
import timsheetService from "../service/timsheet.service.js";
import timeUtils from "../utils/time.utils.js";
import redisUtils from "../utils/redis.utils.js";
import { db } from "../database.js";
import { enqueueSingleTimesheetToXero } from "../queue-jobs/push-single-timesheet.job.js";

export async function list(req, res, next) {
  const { user, organisation } = req.body;
  let { rows_per_page, page_number, sort_by, sort_direction, search } =
    req.query;
  if (!organisation.acl.timesheetManagement.list) {
    return res.status(403).json({
      message: "Access denied: You are not authorized to access this action.",
    });
  }
  try {
    const rowsPerPage = parseInt(rows_per_page) || 10;
    const pageNumber = parseInt(page_number) || 1;
    const offset = (pageNumber - 1) * rowsPerPage;
    const sortBy = sort_by || "id";
    const sortDirection = sort_direction || "asc";

    let whereCondition = {
      organisation_id: organisation.id,
    };

    if (organisation.role.code !== "owner") {
      whereCondition = {
        ...whereCondition,
        employee_id: { [Op.ne]: organisation?.employee?.id },
      };
    }

    // if (organisation?.employee?.id) {
    //   whereCondition = {
    //     ...whereCondition,
    //     employee_id: { [Op.ne]: organisation?.employee?.id },
    //   };
    // }

    if (organisation?.role?.code === "manager") {
      const managerGroups = await ManagementGroupEmployees.findAll({
        where: {
          employee_id: organisation?.employee?.id,
          is_manager: true,
        },
        raw: true,
      });
      const managerGroupIds = managerGroups.map((group) => group.group_id);

      const staffGroups = await ManagementGroupEmployees.findAll({
        where: {
          group_id: { [Op.in]: managerGroupIds },
          is_manager: false,
        },
        raw: true,
      });
      let staffIds = new Set();
      if (staffGroups && staffGroups.length > 0) {
        staffGroups.forEach((group) => {
          if (group?.employee_id) {
            staffIds.add(group.employee_id);
          }
        });
      }
      const uniqueStaffIds = Array.from(staffIds);
      whereCondition = {
        ...whereCondition,
        employee_id: { [Op.in]: uniqueStaffIds },
      };
    }

    if (search && search.trim() !== "") {
      whereCondition = {
        ...whereCondition,
        [Op.or]: [{ code: { [Op.like]: `%${search}%` } }],
      };
    }
    const { count, rows: timesheets } =
      await Timesheets.unscoped().findAndCountAll({
        where: whereCondition,
        include: [
          {
            model: Employees.unscoped(),
            as: "employee",
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
          },
        ],
        offset,
        limit: rowsPerPage,
        order: [[sortBy, sortDirection]],
        raw: false,
        nest: true,
      });

    const total_pages = Math.ceil(timesheets.length / rowsPerPage);

    return res.status(200).json({
      data: timesheets,
      pagination: {
        total_rows: timesheets.length,
        rows_per_page: rowsPerPage,
        page_number: pageNumber,
        total_pages,
        sort_by: sortBy,
        sort_direction: sortDirection,
      },
    });
  } catch (err) {
    console.error("Error fetching timsheets:", err);
    return res.status(500).json({
      message: "Unable to fetch timsheets",
      details: err.message,
    });
  }
}

export async function get(req, res, next) {
  const { user, organisation } = req.body;
  let { type } = req.query;
  const id = req?.params?.id;
  if (!organisation.acl.timesheetManagement.view) {
    return res.status(403).json({
      message: "Access denied: You are not authorized to access this action.",
    });
  }
  try {
    const timesheetStatus = await TimesheetStatus.findOne({
      where: { code: type },
    });

    let whereCondition = {
      organisation_id: organisation.id,
      id: id,
      status_id: timesheetStatus?.id,
    };

    if (organisation.role.code !== "owner") {
      whereCondition = {
        ...whereCondition,
        employee_id: { [Op.ne]: organisation?.employee?.id },
      };
    }

    // if (organisation?.employee?.id) {
    //   whereCondition = {
    //     ...whereCondition,
    //     employee_id: { [Op.ne]: organisation?.employee?.id },
    //   };
    // }

    const employeeTimesheet = await Timesheets.findOne({
      where: {
        organisation_id: organisation.id,
        id: id,
      },
      include: [
        {
          model: Employees.unscoped(),
          as: "employee",
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
        },
      ],
      raw: false,
      nest: true,
    });

    let employeeCondition = {};
    if (organisation?.role?.code === "manager") {
      const managerGroups = await ManagementGroupEmployees.findAll({
        where: {
          employee_id: organisation?.employee?.id,
          is_manager: true,
        },
        raw: true,
      });
      const managerGroupIds = managerGroups.map((group) => group.group_id);

      const staffGroup = await ManagementGroupEmployees.findOne({
        where: {
          group_id: { [Op.in]: managerGroupIds },
          employee_id: employeeTimesheet?.employee_id,
          is_manager: false,
        },
        raw: true,
      });
      employeeCondition = {
        employee_id: staffGroup?.employee_id,
      };
    }

    const employeeTimezone =
      employeeTimesheet?.employee?.user?.timezone?.timezone || null;

    const response = await timsheetService.getTimesheetDays(
      employeeCondition,
      whereCondition,
    );

    if (!response.success) {
      return res.status(response?.code || 500).json({
        message: response?.message || null,
      });
    }
    let timesheet = response?.data;

    timesheet.permissions = await TimesheetConfig.timesheetPermissions(
      true, // is_manangement
      timesheet?.status?.code,
    );

    return res.status(200).json({
      data: timesheet,
    });
  } catch (err) {
    console.error("Error fetching timsheet:", err);
    return res.status(500).json({
      message: "Unable to fetch timsheet",
      details: err.message,
    });
  }
}

export async function getDay(req, res, next) {
  const { user, organisation } = req.body;
  const { employee_id } = req.query;
  const id = req?.params?.id;
  if (!organisation.acl.timesheetManagement.view) {
    return res.status(403).json({
      message: "Access denied: You are not authorized to access this action.",
    });
  }
  try {
    if (!employee_id) {
      return res.status(500).json({
        message: "Employee ID required!",
      });
    }

    const cacheKey = `timesheet_day:${organisation.id}:${employee_id}:${id}`;
    const cached = await redisUtils.getCache(cacheKey);
    if (cached) {
      return res.status(200).json({ data: cached });
    }

    const employeeJson = await Employees.unscoped().findOne({
      where: {
        organisation_id: organisation.id,
        id: employee_id,
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
      return res.status(404).json({
        message: "Employee not found!",
      });
    }

    let whereCondition = {
      organisation_id: organisation.id,
      employee_id: employee_id,
      id: id,
    };

    let employeeTimezone = employee?.details?.user?.timezone?.timezone;

    const response = await timsheetService.getTimesheetDay(
      whereCondition,
      employeeTimezone,
    );

    if (!response.success) {
      return res.status(response?.code || 500).json({
        message: response?.message || null,
      });
    }
    let timesheetDay = response?.data;

    timesheetDay.permissions = await TimesheetConfig.dayTasksPermissions(
      true, // is_management
      timesheetDay.status.code,
    );

    await redisUtils.setCache(cacheKey, timesheetDay);

    return res.status(200).json({
      data: timesheetDay,
    });
  } catch (err) {
    console.error("Error fetching timsheet:", err);
    return res.status(500).json({
      message: "Unable to fetch timsheet",
      details: err.message,
    });
  }
}

export async function create(req, res, next) {
  const { user, employee, period, organisation, push_to_xero } = req.body;
  if (!organisation.acl.timesheetManagement.create) {
    return res.status(403).json({
      message: "Access denied: You are not authorized to access this action.",
    });
  }
  const transaction = await db.transaction();
  try {
    const employeeJson = await Employees.scope("defaultScope").findOne(
      {
        where: {
          organisation_id: organisation.id,
          id: employee.id,
        },
      },
      { transaction },
    );
    const employeeData = employeeJson?.toJSON() ?? null;

    const existingTimesheetPeriod = await Timesheets.findOne(
      {
        where: {
          organisation_id: organisation.id,
          employee_id: employee.id,
          payroll_calendar_id: employeeData?.wage?.payroll_calendar?.id,
          period_start_date: period?.start_date,
          period_end_date: period?.end_date,
        },
        raw: true,
      },
      { transaction },
    );

    if (existingTimesheetPeriod) {
      return res.status(501).json({
        message: "Selected period timesheet already created for that user!",
      });
    }

    if (!employee) {
      return res.status(501).json({
        message: "Employee is required!",
      });
    }
    if (!period) {
      return res.status(501).json({
        message: "Period is required!",
      });
    }

    const timesheetCode = generateTimesheetCode(
      period?.start_date,
      employee?.id,
    );

    const currentUTCTime = moment().utc().format();

    const timesheetDraftStatus = await TimesheetStatus.findOne(
      {
        where: {
          code: "draft",
        },
        raw: true,
      },
      { transaction },
    );

    const timesheet = await Timesheets.create(
      {
        organisation_id: organisation.id,
        employee_id: employee.id,
        code: timesheetCode,
        payroll_calendar_id: employeeData?.wage?.payroll_calendar?.id,
        period_start_date: period?.start_date,
        period_end_date: period?.end_date,
        status_id: timesheetDraftStatus?.id,
        created_at: currentUTCTime,
        created_by: user.id,
      },
      { transaction },
    );

    const timesheetDays = generatePeriodDaysRange(
      period?.start_date,
      period?.end_date,
    );

    const holidays = employeeData?.details?.region?.holidays || null;

    for (const day of timesheetDays) {
      let holiday = null;
      if (holidays && holidays?.length > 0) {
        holiday = holidays.find((h) => h.date === day.date);
      }

      await TimesheetDays.create(
        {
          organisation_id: organisation.id,
          employee_id: employee.id,
          timesheet_id: timesheet.id,
          date: day.date,
          day_of_week: day.day_of_week,
          is_public_holiday: holiday ? true : false,
          holiday_calendar_id: holiday ? holiday?.id : null,
          is_weekend: timeUtils.isWeekend(day.day_of_week),
          created_at: currentUTCTime,
          created_by: user.id,
          updated_at: currentUTCTime,
          updated_by: user.id,
        },
        { transaction },
      );
    }

    await transaction.commit();

    await timsheetService.sendEmailAndNotification(
      user,
      organisation,
      timesheet,
      "create",
    );

    if (organisation?.xero_connection && push_to_xero) {
      await enqueueSingleTimesheetToXero({
        user,
        organisation,
        timesheetId: timesheet.id,
        status: "DRAFT",
      });
    }

    return res.status(200).json({
      message: "Timesheet created",
    });
  } catch (err) {
    console.log("error::", err);
    await transaction.rollback();
    return res.status(err.statusCode || 500).json({
      message:
        err.message || "Unable to create timesheet. Please ty again later.",
    });
  }
}

export async function save(req, res, next) {
  const { user, organisation, is_public_holiday, id: dayId, tasks } = req.body;
  const timesheetId = req?.params?.id;
  if (!organisation.acl.timesheetManagement.edit) {
    return res.status(403).json({
      message: "Access denied: You are not authorized to access this action.",
    });
  }
  try {
    const timesheet = await Timesheets.findOne({
      where: {
        organisation_id: organisation.id,
        id: timesheetId,
      },
      raw: true,
    });

    if (!timesheet) {
      return res.status(404).json({
        message: "Timesheet not found!",
      });
    }

    const timesheetStatus = await TimesheetStatus.findOne({
      where: {
        id: timesheet.status_id,
      },
      raw: true,
    });

    const permission = await TimesheetConfig.dayTasksPermissions(
      true, // is_management
      timesheetStatus?.code,
    );

    if (!permission.can_save) {
      return res.status(403).json({
        message: "Access denied: You are not authorized to access this action.",
      });
    }

    const timesheetDay = await TimesheetDays.findOne({
      where: {
        organisation_id: organisation.id,
        timesheet_id: timesheetId,
        id: dayId,
      },
      raw: true,
    });

    if (!timesheetDay) {
      return res.status(404).json({
        message: "Timesheet day not found!",
      });
    }

    await timsheetService.saveUpdateTimesheetAndTask(
      user,
      organisation.id,
      timesheetDay?.employee_id,
      is_public_holiday,
      timesheetId,
      dayId,
      tasks,
    );

    await redisUtils.delCache(
      `timesheet_day:${organisation.id}:${timesheetDay?.employee_id}:${dayId}`,
    );

    return res.status(200).json({
      message: "Timesheet saved",
    });
  } catch (err) {
    console.log("error::", err);
    return res.status(err.statusCode || 500).json({
      message:
        err.message || "Unable to save timesheet. Please ty again later.",
    });
  }
}

export async function submitForApproval(req, res, next) {
  const { user, organisation, employee_id } = req.body;
  const timesheetId = req?.params?.id;
  if (!organisation.acl.timesheetManagement.edit) {
    return res.status(403).json({
      message: "Access denied: You are not authorized to access this action.",
    });
  }
  try {
    let timesheet = await Timesheets.findOne({
      where: {
        id: timesheetId,
        organisation_id: organisation.id,
        employee_id: employee_id,
      },
    });

    if (!timesheet) {
      return res.status(404).json({
        message: "Timesheet not found!",
      });
    }

    const timesheetStatus = await TimesheetStatus.findOne({
      where: {
        id: timesheet.status_id,
      },
      raw: true,
    });

    const permission = await TimesheetConfig.timesheetPermissions(
      true, // is_manangement
      timesheetStatus?.code,
    );

    if (!permission.can_submit) {
      return res.status(403).json({
        message: "Access denied: You are not authorized to access this action.",
      });
    }

    const timesheetSubmittedStatus = await TimesheetStatus.findOne({
      where: {
        code: "submitted",
      },
      raw: true,
    });

    timesheet.status_id = timesheetSubmittedStatus?.id;

    timesheet.save();

    await timsheetService.sendEmailAndNotification(
      user,
      organisation,
      timesheet,
      "submit-by-manager",
    );

    if (organisation?.xero_connection) {
      await enqueueSingleTimesheetToXero({
        user,
        organisation,
        timesheetId: timesheet.id,
        status: "PROCESSED",
      });
    }

    return res.status(200).json({
      message: "Timesheet submitted",
    });
  } catch (err) {
    console.log("error::", err);
    return res.status(err.statusCode || 500).json({
      message:
        err.message || "Unable to submit timesheet. Please ty again later.",
    });
  }
}

export async function approve(req, res, next) {
  const { user, organisation, employee_id, remarks } = req.body;
  const timesheetId = req?.params?.id;
  if (!organisation.acl.timesheetManagement.edit) {
    return res.status(403).json({
      message: "Access denied: You are not authorized to access this action.",
    });
  }
  try {
    let timesheet = await Timesheets.findOne({
      where: {
        id: timesheetId,
        organisation_id: organisation.id,
        employee_id: employee_id,
      },
    });

    if (!timesheet) {
      return res.status(404).json({
        message: "Timesheet not found!",
      });
    }

    const timesheetStatus = await TimesheetStatus.findOne({
      where: {
        id: timesheet.status_id,
      },
      raw: true,
    });

    const permission = await TimesheetConfig.timesheetPermissions(
      true, // is_manangement
      timesheetStatus?.code,
    );

    if (!permission.can_approve) {
      return res.status(403).json({
        message: "Access denied: You are not authorized to access this action.",
      });
    }

    const timesheetApprovedStatus = await TimesheetStatus.findOne({
      where: {
        code: "approved",
      },
      raw: true,
    });

    timesheet.status_id = timesheetApprovedStatus?.id;
    timesheet.approval_reason = remarks;
    timesheet.reject_reason = null;

    timesheet.save();

    await timsheetService.sendEmailAndNotification(
      user,
      organisation,
      timesheet,
      "approve",
    );

    if (organisation?.xero_connection) {
      await enqueueSingleTimesheetToXero({
        user,
        organisation,
        timesheetId: timesheet.id,
        status: "APPROVED",
      });
    }

    return res.status(200).json({
      message: "Timesheet approved",
    });
  } catch (err) {
    console.log("error::", err);
    return res.status(err.statusCode || 500).json({
      message:
        err.message || "Unable to approve timesheet. Please ty again later.",
    });
  }
}

export async function reject(req, res, next) {
  const { user, organisation, employee_id, remarks } = req.body;
  const timesheetId = req?.params?.id;
  if (!organisation.acl.timesheetManagement.edit) {
    return res.status(403).json({
      message: "Access denied: You are not authorized to access this action.",
    });
  }
  try {
    let timesheet = await Timesheets.findOne({
      where: {
        id: timesheetId,
        organisation_id: organisation.id,
        employee_id: employee_id,
      },
    });

    if (!timesheet) {
      return res.status(404).json({
        message: "Timesheet not found!",
      });
    }

    const timesheetStatus = await TimesheetStatus.findOne({
      where: {
        id: timesheet.status_id,
      },
      raw: true,
    });

    const permission = await TimesheetConfig.timesheetPermissions(
      true, // is_manangement
      timesheetStatus?.code,
    );

    if (!permission.can_reject) {
      return res.status(403).json({
        message: "Access denied: You are not authorized to access this action.",
      });
    }

    const timesheetRejectedStatus = await TimesheetStatus.findOne({
      where: {
        code: "rejected",
      },
      raw: true,
    });

    timesheet.status_id = timesheetRejectedStatus?.id;
    timesheet.approval_reason = null;
    timesheet.reject_reason = remarks;

    timesheet.save();

    await timsheetService.sendEmailAndNotification(
      user,
      organisation,
      timesheet,
      "reject",
    );

    if (organisation?.xero_connection) {
      await enqueueSingleTimesheetToXero({
        user,
        organisation,
        timesheetId: timesheet.id,
        status: "DRAFT",
      });
    }

    return res.status(200).json({
      message: "Timesheet rejected",
    });
  } catch (err) {
    console.log("error::", err);
    return res.status(err.statusCode || 500).json({
      message:
        err.message || "Unable to reject timesheet. Please ty again later.",
    });
  }
}

export async function revert(req, res, next) {
  const { user, organisation, employee_id } = req.body;
  const timesheetId = req?.params?.id;
  if (!organisation.acl.timesheetManagement.edit) {
    return res.status(403).json({
      message: "Access denied: You are not authorized to access this action.",
    });
  }
  try {
    let timesheet = await Timesheets.findOne({
      where: {
        id: timesheetId,
        organisation_id: organisation.id,
        employee_id: employee_id,
      },
    });

    if (!timesheet) {
      return res.status(404).json({
        message: "Timesheet not found!",
      });
    }

    const timesheetStatus = await TimesheetStatus.findOne({
      where: {
        id: timesheet.status_id,
      },
      raw: true,
    });

    const permission = await TimesheetConfig.timesheetPermissions(
      true, // is_manangement
      timesheetStatus?.code,
    );

    if (!permission.can_revert_to_draft) {
      return res.status(403).json({
        message: "Access denied: You are not authorized to access this action.",
      });
    }

    const timesheetDraftStatus = await TimesheetStatus.findOne({
      where: {
        code: "draft",
      },
      raw: true,
    });

    timesheet.status_id = timesheetDraftStatus?.id;
    timesheet.approval_reason = null;
    timesheet.reject_reason = null;

    timesheet.save();

    await timsheetService.sendEmailAndNotification(
      user,
      organisation,
      timesheet,
      "revert",
    );

    if (organisation?.xero_connection) {
      await enqueueSingleTimesheetToXero({
        user,
        organisation,
        timesheetId: timesheet.id,
        status: "DRAFT",
      });
    }

    return res.status(200).json({
      message: "Timesheet revert back to draft",
    });
  } catch (err) {
    console.log("error::", err);
    return res.status(err.statusCode || 500).json({
      message:
        err.message || "Unable to revert timesheet. Please ty again later.",
    });
  }
}

export async function employeePayrollCycles(req, res, next) {
  const { user, name, organisation } = req.body;
  const employee_id = req?.params?.employee_id;
  if (!organisation.acl.timesheetManagement.create) {
    return res.status(403).json({
      message: "Access denied: You are not authorized to access this action.",
    });
  }
  try {
    let whereCondition = {
      organisation_id: organisation.id,
      id: employee_id,
    };

    const employee = await Employees.scope("defaultScope").findOne({
      where: whereCondition,
      col: "Employees.id",
    });

    if (!employee?.wage && !employee?.wage?.payroll_calendar) {
      return res.status(500).json({
        message:
          "Payroll calendar is not configured. Please set up the payroll calendar and complete the required information on the employee page.",
      });
    }

    const existingTimesheet = await Timesheets.findOne({
      where: {
        organisation_id: organisation.id,
        employee_id: employee_id,
        payroll_calendar_id: employee?.wage?.payroll_calendar?.id,
      },
      order: [["created_at", "DESC"]],
      raw: true,
    });

    let periods = [];

    const formatDisplay = (d) => moment(d, "YYYY-MM-DD").format("DD MMM YYYY");
    const parse = (d) => moment(d, "YYYY-MM-DD");

    if (!existingTimesheet) {
      periods.push({
        start_date: moment(employee?.wage?.payroll_calendar?.start_date).format(
          "YYYY-MM-DD",
        ),
        end_date: moment(employee?.wage?.payroll_calendar?.end_date).format(
          "YYYY-MM-DD",
        ),
        label: `${formatDisplay(
          employee?.wage?.payroll_calendar?.start_date,
        )} - ${formatDisplay(employee?.wage?.payroll_calendar?.end_date)}`,
      });
    } else {
      let lastPeriodEnd = parse(existingTimesheet.period_end_date);
      const nextTimesheetStartDate = lastPeriodEnd.clone().add(1, "day");
      let nextTimesheetEndDate = null;
      const payCycleFrequency =
        employee?.wage?.payroll_calendar?.pay_cycle?.code;

      switch (payCycleFrequency) {
        case "WEEKLY":
          nextTimesheetEndDate = nextTimesheetStartDate
            .clone()
            .add(7, "days")
            .subtract(1, "day");
          break;

        case "FORTNIGHTLY":
          nextTimesheetEndDate = nextTimesheetStartDate
            .clone()
            .add(14, "days")
            .subtract(1, "day");
          break;

        case "FOURWEEKLY":
          nextTimesheetEndDate = nextTimesheetStartDate
            .clone()
            .add(28, "days")
            .subtract(1, "day");
          break;

        case "MONTHLY":
          nextTimesheetEndDate = nextTimesheetStartDate
            .clone()
            .add(1, "month")
            .subtract(1, "day");
          break;

        case "TWICEMONTHLY":
          // Usually 1–15 and 16–end of month
          const day = nextTimesheetStartDate.date();

          if (day <= 15) {
            nextTimesheetEndDate = nextTimesheetStartDate.clone().date(15);
          } else {
            nextTimesheetEndDate = nextTimesheetStartDate
              .clone()
              .endOf("month");
          }
          break;

        case "QUARTERLY":
          nextTimesheetEndDate = nextTimesheetStartDate
            .clone()
            .add(3, "months")
            .subtract(1, "day");
          break;

        default:
          throw new Error("Unsupported pay cycle frequency");
      }

      periods.push({
        start_date: moment(nextTimesheetStartDate).format("YYYY-MM-DD"),
        end_date: moment(nextTimesheetEndDate).format("YYYY-MM-DD"),
        label: `${formatDisplay(nextTimesheetStartDate)} - ${formatDisplay(
          nextTimesheetEndDate,
        )}`,
      });
    }

    return res.status(200).json({
      data: periods,
    });
  } catch (err) {
    console.log("error::", err);
    res.status(500).json({
      message:
        "Unable to fetch timesheet employee payroll cycle. Please ty again later.",
      details: err,
    });
  }
}

function generateTimesheetCode(dateString, employeeId) {
  // Generate 4 random uppercase letters
  const randomLetters = Array.from({ length: 4 }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26)),
  ).join("");

  // Remove hyphens from date (e.g., "2025-11-19" → "20251119")
  const formattedDate = dateString.replace(/-/g, "");

  // Final code
  return `${randomLetters}${formattedDate}${employeeId}`;
}

function generatePeriodDaysRange(start_date, end_date) {
  const start = moment(start_date);
  const end = moment(end_date);

  const result = [];

  let current = start.clone();

  while (current <= end) {
    result.push({
      date: current.format("YYYY-MM-DD"),
      day_of_week: current.day(), // 0 = Sunday, 6 = Saturday
    });
    current.add(1, "day");
  }

  return result;
}
