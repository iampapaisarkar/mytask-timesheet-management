import { Op } from "sequelize";
import models from "../models/index.js";
import timeUtils from "./timeUtils.js";
import taskUtils from "./taskUtils.js";
import ruleUtils from "./ruleUtils.js";

const {
  Users,
  Employees,
  EmployeeWages,
  TimesheetDays,
  TimesheetDayTasks,
  UserTimezones,
  AwardRates,
  AwardRateSettings,
  AwardRateRules,
} = models;

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
              { model: AwardRateSettings, as: "settings" },
              { model: AwardRateRules, as: "rules" },
            ],
          },
        ],
      },
    ],
  });
  return employeeData?.toJSON() || null;
}

function parseAwardRules(raw) {
  // defensive parsing
  try {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string") return JSON.parse(raw);
    if (raw.rules && typeof raw.rules === "string")
      return JSON.parse(raw.rules);
    return raw;
  } catch (e) {
    console.warn("parseAwardRules failed", e.message);
    return [];
  }
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
    if (!tsDay) throw new Error("Timesheet day not found");
    return [tsDay];
  }

  if (from && to) {
    const tsDays = await TimesheetDays.findAll({
      where: {
        organisation_id: organisation.id,
        timesheet_id,
        date: { [Op.between]: [from, to] },
      },
      include: [{ model: TimesheetDayTasks, as: "tasks" }],
      raw: false,
      nest: true,
    });
    if (!tsDays) throw new Error("Timesheet days not found");
    return tsDays;
  }

  throw new Error("Provide timesheet_day_id OR start_date + end_date");
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
  if (!employee) throw new Error("Employee not found");

  const employeeTimezone = employee?.details?.user?.timezone?.timezone || "UTC";
  const employeeHourlyRate =
    parseFloat(employee?.wage?.hourly_rate_exc_super) || 0;
  const awardRateRules = parseAwardRules(
    employee?.wage?.award_rate?.rules || employee?.wage?.award_rate?.rules
  );

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

    const workingTasks = taskUtils.filterByType(tasks, "work");
    const travelTasks = taskUtils.filterByType(tasks, "travel");
    const breakTasks = taskUtils.filterByType(tasks, "break");

    const totalWorkingHours = timeUtils.sumTaskHours(
      workingTasks,
      employeeTimezone
    );
    const totalTravelHours = timeUtils.sumTaskHours(
      travelTasks,
      employeeTimezone
    );
    const totalBreakHours = timeUtils.sumTaskHours(
      breakTasks,
      employeeTimezone
    );

    const workingPeriods = timeUtils.formatTaskTimes(
      workingTasks,
      employeeTimezone
    );
    const travelPeriods = timeUtils.formatTaskTimes(
      travelTasks,
      employeeTimezone
    );
    const breakPeriods = timeUtils.formatTaskTimes(
      breakTasks,
      employeeTimezone
    );

    const originalRate = toFixedTruncWithZeros(
      totalWorkingHours * employeeHourlyRate
    );

    // select day rule
    const dayName = ruleUtils.getDayNameFromNumber(tsDay.day_of_week);
    let rule = awardRateRules.find((r) => r.day?.code === dayName);

    if (tsDay.is_public_holiday) {
      const holidayRule = awardRateRules.find(
        (r) => r.day?.code === "public-holiday"
      );
      if (holidayRule) rule = holidayRule;
    }

    const awardRates = [];
    const comparisons = [];

    if (rule?.rule && Array.isArray(rule.rule.if)) {
      for (const ifx of rule.rule.if) {
        const taskType = ifx.field.category;
        const tasksForRule = taskUtils.filterByType(tasks, taskType);

        const compareResult = ruleUtils.evaluateIf(
          ifx,
          tasksForRule,
          employeeTimezone
        );
        comparisons.push(compareResult);

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

    results.push({
      date: tsDay.date,
      day_name: tsDay.day_name,
      is_public_holiday: tsDay.is_public_holiday,
      is_weekend: tsDay.is_weekend,
      award_rates: awardRates,
      working_periods: workingPeriods,
      total_working_hours: timeUtils.toHM(totalWorkingHours),
      travel_periods: travelPeriods,
      total_travel_hours: timeUtils.toHM(totalTravelHours),
      break_periods: breakPeriods,
      total_break_hours: timeUtils.toHM(totalBreakHours),
      total_original_rate: originalRate,
      total_extra_rate: 0, // placeholder: rule application on rates can be added here
      comparisons,
    });
  }

  return results;
}

export default { calculate };
