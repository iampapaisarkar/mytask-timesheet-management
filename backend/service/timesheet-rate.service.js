import { Op } from "sequelize";
import models from "../models/index.js";
import timeUtils from "../utils/time.utils.js";
import taskUtils from "../utils/task.utils.js";
import ruleUtils from "../utils/rule.utils.js";

const {
  Users,
  Employees,
  EmployeeWages,
  Timesheets,
  TimesheetDays,
  TimesheetDayTasks,
  UserTimezones,
  AwardRates,
  AwardRateSettings,
  RoundingIntervals,
  AwardRateRules,
  AwardRateRuleIfs,
  AwardRateRuleThen,
  AwardRateRuleDays,
  AwardRateRuleFields,
  AwardRateRuleComparators,
  AwardRateRuleFieldTypes,
  EarningRates,
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
        include: [
          {
            model: AwardRates,
            as: "award_rate",
            include: [
              {
                model: AwardRateSettings,
                as: "settings",
                include: [
                  {
                    model: RoundingIntervals,
                    as: "rounding_interval",
                  },
                ],
              },
              {
                model: AwardRateRules,
                as: "rules",
                include: [
                  {
                    model: AwardRateRuleDays,
                    as: "days",
                    through: { attributes: [] },
                  },
                  {
                    model: AwardRateRuleIfs,
                    as: "if",
                    include: [
                      {
                        model: AwardRateRuleFields,
                        as: "field",
                        include: [
                          {
                            model: AwardRateRuleFieldTypes,
                            as: "field_type",
                          },
                        ],
                      },
                      {
                        model: AwardRateRuleComparators,
                        as: "comparison",
                      },
                      {
                        model: AwardRateRuleThen,
                        as: "then",
                        include: [
                          {
                            model: EarningRates,
                            as: "rate",
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
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

  // Vue reports send period_start_date / period_end_date as from / to.
  // If omitted, resolve the period from the timesheet itself.
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
  const employeeHourlyRate =
    parseFloat(employee?.wage?.hourly_rate_exc_super) || 0;
  const awardRateRules = employee?.wage?.award_rate?.rules;

  const timesheetDays = await fetchTimesheetDays({
    organisation,
    timesheet_id,
    timesheet_day_id,
    from,
    to,
  });

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

    const workingPeriods = timeUtils.formatTaskTimes(
      workingTasks,
      employeeTimezone,
    );
    const travelPeriods = timeUtils.formatTaskTimes(
      travelTasks,
      employeeTimezone,
    );
    const breakPeriods = timeUtils.formatTaskTimes(
      breakTasks,
      employeeTimezone,
    );

    const originalRate = toFixedTruncWithZeros(
      totalWorkingHours * employeeHourlyRate,
    );

    // select day rule
    const dayName = ruleUtils.getDayNameFromNumber(tsDay.day_of_week);
    let rule = awardRateRules.find((r) =>
      r.days?.some((d) => d.code === dayName),
    );

    if (tsDay.is_public_holiday) {
      const holidayRule = awardRateRules.find(
        r.days?.some((d) => d.code === "public-holiday"),
      );
      if (holidayRule) rule = holidayRule;
    }

    const awardRates = [];
    const comparisons = [];

    if (rule && Array.isArray(rule.if)) {
      for (const ifx of rule.if) {
        const taskType = ifx.field.category;
        const tasksForRule = taskUtils.filterByType(tasks, taskType);

        if (tasksForRule?.length > 0) {
          const compareResult = ruleUtils.evaluateIf(
            ifx,
            tasksForRule,
            employeeTimezone,
          );
          comparisons.push(compareResult);
        }

        // group award rates by id
        let existing = awardRates.find((a) => a.rate_id === ifx.then?.rate?.id);
        const label = ruleUtils.getRuleLabel(ifx, taskType);
        if (existing) existing.rules.push({ label });
        else
          awardRates.push({
            label: ifx.then?.rate?.name,
            rate_id: ifx.then?.rate?.id,
            rules: [{ label }],
          });
      }
    }

    // get only matched comparisons
    const matchedComparisons = comparisons.filter(
      (c) => c?.condition_matched === true,
    );

    let maxRatePercent = 0;
    let maxRateId = null;

    if (matchedComparisons.length > 0) {
      const maxComparison = matchedComparisons.reduce((max, current) => {
        const currentRate = parseFloat(current.rate_percent) || 0;
        const maxRate = parseFloat(max.rate_percent) || 0;
        return currentRate > maxRate ? current : max;
      });

      maxRatePercent = parseFloat(maxComparison.rate_percent) || 0;
      maxRateId = maxComparison.rate_id;
    }

    results.push({
      date: tsDay.date,
      day_name: tsDay.day_name,
      is_public_holiday: tsDay.is_public_holiday,
      is_weekend: tsDay.is_weekend,
      award_rates: awardRates,
      comparisons,
      working_periods: workingPeriods,
      travel_periods: travelPeriods,
      break_periods: breakPeriods,
      total_working_hours: timeUtils.toHM(totalWorkingHours),
      total_travel_hours: timeUtils.toHM(totalTravelHours),
      total_break_hours: timeUtils.toHM(totalBreakHours),
      total_working_hours_in_decimal: Number(totalWorkingHours.toFixed(2)),
      total_original_payout_amount: Number(originalRate),
      total_payble_amount: maxRatePercent
        ? Number(
            (
              totalWorkingHours *
              employeeHourlyRate *
              (maxRatePercent / 100)
            ).toFixed(2),
          )
        : Number(originalRate),
      earning_rate_id: maxRateId,
      earning_rate_percent: maxRatePercent,
    });
  }

  return results;
}

export default { calculate };
