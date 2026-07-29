import { fn, col, literal, Op } from "sequelize";
import { mysheet } from "../database.js";
import models from "../models/index.js";
const {
  Users,
  UserTimezones,
  Employees,
  Timesheets,
  TimesheetDays,
  TimesheetStatus,
} = models;
import { TimesheetConfig } from "../class/timesheet.config.js";
import timsheetService from "../service/timsheet.service.js";
import redisUtils from "../utils/redis.utils.js";
import { enqueueSingleTimesheetToXero } from "../queue-jobs/push-single-timesheet.job.js";

export async function list(req, res, next) {
  const { user, organisation } = req.body;
  let { rows_per_page, page_number, sort_by, sort_direction, search } =
    req.query;
  if (!organisation.acl.timesheet.list) {
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
      employee_id: organisation?.employee?.id,
    };

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
  if (!organisation.acl.timesheet.view) {
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
      employee_id: organisation?.employee?.id,
      status_id: timesheetStatus?.id,
      id: id,
    };

    const response = await timsheetService.getTimesheetDays(
      null,
      whereCondition
    );

    if (!response.success) {
      return res.status(response?.code || 500).json({
        message: response?.message || null,
      });
    }
    let timesheet = response?.data;

    timesheet.permissions = await TimesheetConfig.timesheetPermissions(
      false, // is_manangement
      timesheet?.status?.code
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
  const id = req?.params?.id;
  if (!organisation.acl.timesheet.view) {
    return res.status(403).json({
      message: "Access denied: You are not authorized to access this action.",
    });
  }
  try {
    const cacheKey = `timesheet_day:${organisation.id}:${organisation?.employee?.id}:${id}`;
    const cached = await redisUtils.getCache(cacheKey);
    if (cached) {
      return res.status(200).json({ data: cached });
    }

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
      return res.status(response?.code || 500).json({
        message: response?.message || null,
      });
    }
    let timesheetDay = response?.data;

    timesheetDay.permissions = await TimesheetConfig.dayTasksPermissions(
      false, // is_management
      timesheetDay.status.code
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

export async function save(req, res, next) {
  const { user, organisation, is_public_holiday, id: dayId, tasks } = req.body;
  const timesheetId = parseInt(req?.params?.id);
  if (!organisation.acl.timesheet.edit) {
    return res.status(403).json({
      message: "Access denied: You are not authorized to access this action.",
    });
  }
  try {
    const timesheet = await Timesheets.findOne({
      where: {
        organisation_id: organisation.id,
        id: timesheetId,
        employee_id: organisation?.employee?.id,
      },
      raw: true,
    });

    if (!timesheet) {
      return res.status(404).json({
        message: "Timesheet not found!",
      });
    }

    const timesheetDay = await TimesheetDays.findOne({
      where: {
        organisation_id: organisation.id,
        timesheet_id: timesheetId,
        id: dayId,
        employee_id: organisation?.employee?.id,
      },
      raw: true,
    });

    if (!timesheetDay) {
      return res.status(404).json({
        message: "Timesheet day not found!",
      });
    }

    const timesheetStatus = await TimesheetStatus.findOne({
      where: {
        id: timesheet.status_id,
      },
      raw: true,
    });

    const permission = await TimesheetConfig.dayTasksPermissions(
      false, // is_management
      timesheetStatus?.code
    );

    if (!permission.can_save) {
      return res.status(403).json({
        message: "Access denied: You are not authorized to access this action.",
      });
    }

    await timsheetService.saveUpdateTimesheetAndTask(
      user,
      organisation.id,
      organisation?.employee?.id,
      is_public_holiday,
      timesheetId,
      dayId,
      tasks
    );

    await redisUtils.delCache(
      `timesheet_day:${organisation.id}:${organisation?.employee?.id}:${dayId}`
    );
    return res.status(200).json({
      message: "Timesheet saved",
    });
  } catch (err) {
    console.log("error::", err);
    res.status(500).json({
      message: "Unable to save timesheet. Please ty again later.",
      details: err,
    });
  }
}

export async function submitForApproval(req, res, next) {
  const { user, organisation } = req.body;
  const timesheetId = req?.params?.id;
  if (!organisation.acl.timesheet.edit) {
    return res.status(403).json({
      message: "Access denied: You are not authorized to access this action.",
    });
  }
  try {
    let timesheet = await Timesheets.findOne({
      where: {
        organisation_id: organisation.id,
        id: timesheetId,
        employee_id: organisation?.employee?.id,
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
      false, // is_manangement
      timesheetStatus?.code
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
      "submit-by-staff"
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
      message: "Timesheet submitted for approval",
    });
  } catch (err) {
    console.log("error::", err);
    res.status(500).json({
      message:
        "Unable to submit timesheet for approval. Please ty again later.",
      details: err,
    });
  }
}
