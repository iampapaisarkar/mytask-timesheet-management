import { Op } from "sequelize";
import models from "../models/index.js";
import timeUtils from "../utils/time.utils.js";
import taskUtils from "../utils/task.utils.js";

const {
  Users,
  Employees,
  EmployeeWages,
  Timesheets,
  TimesheetDays,
  TimesheetDayTasks,
  UserTimezones,
} = models;

class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

async function fetchEmployee(organisation, employee_id) {
  const employeeData = await Employees.scope("defaultScope").findOne({
    where: { organisation_id: organisation.id, id: employee_id },
    include: [
      {
        model: Users,
        as: "user",
        include: [{ model: UserTimezones, as: "timezone" }],
      },
      {
        model: EmployeeWages,
        as: "wage",
      },
    ],
  });
  return employeeData?.toJSON() || null;
}

async function fetchTimesheetDays({
  organisation,
  timesheet_id,
  timesheet_day_id,
  from,
  to,
}) {
  if (timesheet_day_id) {
    const tsDay = await TimesheetDays.findOne({
      where: {
        organisation_id: organisation.id,
        id: timesheet_day_id,
        timesheet_id,
      },
      include: [{ model: TimesheetDayTasks, as: "tasks" }],
      raw: false,
      nest: true,
    });
    if (!tsDay) throw new AppError("Timesheet day not found", 400);
    return [tsDay];
  }

  let rangeFrom = from;
  let rangeTo = to;
  if ((!rangeFrom || !rangeTo) && timesheet_id) {
    const ts = await Timesheets.findOne({
      where: {
        organisation_id: organisation.id,
        id: timesheet_id,
      },
      attributes: ["id", "period_start_date", "period_end_date"],
      raw: true,
    });
    if (!ts) throw new AppError("Timesheet not found", 400);
    rangeFrom = rangeFrom || ts.period_start_date;
    rangeTo = rangeTo || ts.period_end_date;
  }

  if (rangeFrom && rangeTo) {
    const tsDays = await TimesheetDays.findAll({
      where: {
        organisation_id: organisation.id,
        timesheet_id,
        date: {
          [Op.gte]: rangeFrom,
          [Op.lte]: rangeTo,
        },
      },
      include: [{ model: TimesheetDayTasks, as: "tasks" }],
      order: [["date", "ASC"]],
      raw: false,
      nest: true,
    });

    return tsDays || [];
  }

  throw new AppError(
    "Provide timesheet_day_id OR from + to (period start/end dates)",
    400,
  );
}

function toFixedTruncWithZeros(num, decimals = 2) {
  const truncated =
    Math.floor(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
  return truncated.toFixed(decimals);
}

function resolveDayPayableAmount({ wage, totalWorkingHours, dayCount }) {
  const payType = String(wage?.pay_type || "HOURLY").toUpperCase();
  const hourly = parseFloat(wage?.hourly_rate_exc_super) || 0;
  const fixed = parseFloat(wage?.fixed_rate_exc_super) || 0;

  if (payType === "FIXED") {
    // Spread fixed period rate evenly across days in the calculated set.
    const share = dayCount > 0 ? fixed / dayCount : 0;
    return Number(toFixedTruncWithZeros(share));
  }

  return Number(toFixedTruncWithZeros(totalWorkingHours * hourly));
}

/**
 * MVP rate calculation: hourly XOR fixed wage — no award/earning rule engine.
 */
async function calculate(params) {
  const {
    organisation,
    timesheet_id,
    timesheet_day_id,
    employee_id,
    from,
    to,
  } = params;

  const employee = await fetchEmployee(organisation, employee_id);
  if (!employee) throw new AppError("Employee not found", 400);

  const employeeTimezone = employee?.details?.user?.timezone?.timezone || "UTC";
  const wage = employee?.wage || {};

  const timesheetDays = await fetchTimesheetDays({
    organisation,
    timesheet_id,
    timesheet_day_id,
    from,
    to,
  });

  const dayCount = timesheetDays.length || 1;
  const results = [];

  for (const tsDay of timesheetDays) {
    const tasks = tsDay.tasks || [];

    const workingTasks = taskUtils.filterByType(tasks, "working");
    const travelTasks = taskUtils.filterByType(tasks, "travel");
    const breakTasks = taskUtils.filterByType(tasks, "break");

    const totalWorkingHours = timeUtils.sumTaskHours(
      workingTasks,
      employeeTimezone,
    );
    const totalTravelHours = timeUtils.sumTaskHours(
      travelTasks,
      employeeTimezone,
    );
    const totalBreakHours = timeUtils.sumTaskHours(
      breakTasks,
      employeeTimezone,
    );

    const payable = resolveDayPayableAmount({
      wage,
      totalWorkingHours,
      dayCount,
    });

    results.push({
      date: tsDay.date,
      day_name: tsDay.day_name,
      is_public_holiday: tsDay.is_public_holiday,
      is_weekend: tsDay.is_weekend,
      award_rates: [],
      comparisons: [],
      working_periods: timeUtils.formatTaskTimes(workingTasks, employeeTimezone),
      travel_periods: timeUtils.formatTaskTimes(travelTasks, employeeTimezone),
      break_periods: timeUtils.formatTaskTimes(breakTasks, employeeTimezone),
      total_working_hours: timeUtils.toHM(totalWorkingHours),
      total_travel_hours: timeUtils.toHM(totalTravelHours),
      total_break_hours: timeUtils.toHM(totalBreakHours),
      total_working_hours_in_decimal: Number(totalWorkingHours.toFixed(2)),
      total_original_payout_amount: payable,
      total_payble_amount: payable,
      earning_rate_id: null,
      earning_rate_percent: 0,
      pay_type: String(wage?.pay_type || "HOURLY").toUpperCase(),
    });
  }

  return results;
}

export default { calculate };
