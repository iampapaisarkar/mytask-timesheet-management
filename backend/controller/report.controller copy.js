// Updated full controller implementing Option A (0=Sunday..6=Saturday)
// Includes: multi-day support, working/break/travel grouping, daily-break,
// first/last travel trips, correct rule.day.code mapping, public-holiday override

import { fn, col, literal, Op } from "sequelize";
import { db } from "../database.js";
import models from "../models/index.js";
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

import moment from "moment-timezone";

export async function rateByTimesheetPeriod(req, res, next) {
  const { user, organisation } = req.body;
  let { timesheet_id, timesheet_day_id, employee_id, from, to } = req.query;

  try {
    if (!timesheet_id || !employee_id) {
      return res.status(400).json({
        message: "timesheet_id and employee_id are required",
      });
    }

    // Load employee + wages + award rules
    const employeeData = await Employees.scope("defaultScope").findOne({
      where: {
        organisation_id: organisation.id,
        id: employee_id,
      },
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

    const employee = employeeData?.toJSON() || null;
    if (!employee)
      return res.status(404).json({ message: "Employee not found" });

    const employeeTimezone =
      employee?.details?.user?.timezone?.timezone || "UTC";

    const employeeHourlyRate =
      parseFloat(employee?.wage?.hourly_rate_exc_super) || 0;

    // Safe parse of award rate rules
    let awardRateRules = [];
    try {
      const rulesField = employee?.wage?.award_rate?.rules;
      if (!rulesField) awardRateRules = [];
      else if (typeof rulesField === "string")
        awardRateRules = JSON.parse(rulesField);
      else if (rulesField.rules && typeof rulesField.rules === "string")
        awardRateRules = JSON.parse(rulesField.rules);
      else if (Array.isArray(rulesField)) awardRateRules = rulesField;
      else awardRateRules = rulesField;
    } catch (e) {
      console.warn("awardRateRules parse failed:", e.message);
      awardRateRules = [];
    }

    let timesheetDays = [];

    // Single day
    if (timesheet_day_id) {
      const tsDay = await TimesheetDays.findOne({
        where: {
          organisation_id: organisation.id,
          id: timesheet_day_id,
          timesheet_id,
        },
        include: [
          {
            model: TimesheetDayTasks,
            as: "tasks",
          },
        ],
        raw: false,
        nest: true,
      });

      if (!tsDay)
        return res.status(404).json({ message: "Timesheet day not found" });
      timesheetDays = [tsDay];
    }
    // Multi-day
    else if (from && to) {
      const tsDays = await TimesheetDays.findAll({
        where: {
          organisation_id: organisation.id,
          timesheet_id,
          date: {
            [Op.between]: [from, to],
          },
        },
        include: [
          {
            model: TimesheetDayTasks,
            as: "tasks",
          },
        ],
        raw: false,
        nest: true,
      });
      if (!tsDays)
        return res.status(404).json({ message: "Timesheet days not found" });
      timesheetDays = tsDays;
    } else {
      return res.status(400).json({
        message: "Provide timesheet_day_id OR start_date + end_date",
      });
    }

    if (!timesheetDays.length) {
      return res.json({ data: {} });
    }

    const calculatedRates = await calculateRatesByAwardRateRules(
      timesheetDays,
      awardRateRules,
      employeeTimezone,
      employeeHourlyRate
    );

    // let totalExtraRate = 0;
    // for (const award of calculatedRates) {
    // }

    return res.json({
      data: calculatedRates,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Error computing rates",
      details: err.message,
    });
  }
}

async function calculateRatesByAwardRateRules(
  timesheetDays,
  awardRateRules,
  employeeTimezone,
  employeeHourlyRate
) {
  let response = [];
  for (let timesheetDay of timesheetDays) {
    // default working, travel & break hours and rate
    const totalWorkingHours = getTotalWorkingHours(
      timesheetDay.tasks,
      employeeTimezone
    );
    const totalTravelHours = getTotalTravelHours(
      timesheetDay.tasks,
      employeeTimezone
    );
    const totalBreakHours = getTotalBreakHours(
      timesheetDay.tasks,
      employeeTimezone
    );
    const workingPeriods = getWorkingTimes(
      timesheetDay.tasks,
      employeeTimezone
    );
    const travelPeriods = getTravelTimes(timesheetDay.tasks, employeeTimezone);
    const breakPeriods = getBreakTimes(timesheetDay.tasks, employeeTimezone);

    const originalRate = toFixedTruncWithZeros(
      totalWorkingHours * employeeHourlyRate
    );
    let totalExtraRate = 0;

    const dayName = getDayNameFromNumber(timesheetDay.day_of_week);
    // Pick rule for this day
    let rule = awardRateRules.find((r) => r.day?.code === dayName);

    if (timesheetDay.is_public_holiday) {
      const holidayRule = awardRateRules.find(
        (r) => r.day?.code === "public-holiday"
      );
      if (holidayRule) rule = holidayRule;
    }
    let awardRates = [];
    let comparisions = [];
    if (rule?.rule) {
      // checking rules
      for (const ifx of rule.rule.if) {
        const field = ifx.field.code;
        const fieldType = ifx.field.field_type.code;
        const comparisonCode = ifx.comparison.code;
        const comparisonName = ifx.comparison.name;
        const valueCompare = ifx.value;
        const fromCompare = ifx.from;
        const toCompare = ifx.to;
        const taskType = ifx.field.category;

        // console.log("********************");
        // console.log("field::", field);
        // console.log("fieldType::", fieldType);
        // console.log("comparison::", comparison);
        // console.log("valueCompare::", valueCompare);
        // console.log("fromCompare::", fromCompare);
        // console.log("toCompare::", toCompare);
        // console.log("taskType::", taskType);
        // console.log("********************");

        const tasks = getTaskByType(timesheetDay.tasks, taskType);

        const result = compare(
          field,
          comparisonCode,
          comparisonName,
          fieldType,
          valueCompare,
          fromCompare,
          toCompare,
          tasks,
          ifx.then?.rate,
          employeeTimezone
        );

        comparisions.push(result);

        const existingEarningRate = awardRates.find(
          (item) => item.rate_id === ifx.then?.rate?.id
        );

        const newRule = {
          label: getRuleLabel(
            ifx,
            taskType,
            fieldType,
            fromCompare,
            toCompare,
            valueCompare
          ),
        };

        if (existingEarningRate) {
          // push into the existingEarningRate rules array
          existingEarningRate.rules.push(newRule);
          // existingEarningRate.OK = OK;
        } else {
          // create new object with rules array
          awardRates.push({
            label: ifx.then?.rate?.name,
            rate_id: ifx.then?.rate?.id,
            rules: [newRule],
            // OK,
          });
        }
      }

      // const allOK = reasons.every((reason) => reason.OK === true);
      // let extra_rates = [];
      // if (allOK) {
      //   for (const thenx of condition.then) {
      //     const extra = toFixedTruncWithZeros(
      //       originalRate * (parseFloat(thenx.rate.rate) / 100)
      //     );
      //     totalExtraRate += toFixedTruncWithZeros(originalRate + extra);
      //     extra_rates.push({
      //       // total_with_extra: totalWithExtra,
      //       extra: extra,
      //       label: thenx.rate.label,
      //       value: thenx.rate.rate,
      //     });
      //   }
      // }
      // awards.push({
      //   // reasons,
      //   extra_rates,
      // });
    }

    response.push({
      date: timesheetDay.date,
      day_name: timesheetDay.day_name,
      is_public_holiday: timesheetDay.is_public_holiday,
      is_weekend: timesheetDay.is_weekend,
      award_rates: awardRates,
      working_periods: workingPeriods,
      total_working_hours: toHM(totalWorkingHours),
      travel_periods: travelPeriods,
      total_travel_hours: toHM(totalTravelHours),
      break_periods: breakPeriods,
      total_break_hours: toHM(totalBreakHours),
      total_original_rate: originalRate,
      total_extra_rate: totalExtraRate,
      comparisions,
    });
  }

  return response;
}

function getDayNameFromNumber(n) {
  const DAY_MAP = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  return DAY_MAP[n] || null;
}

function getTotalWorkingHours(tasks, tz = employeeTimezone) {
  const workings = getTaskByType(tasks, "work");
  return getHoursForTasks(workings, tz);
}
function getWorkingTimes(tasks, tz = employeeTimezone) {
  const workings = getTaskByType(tasks, "work");
  return formatTaskTimes(workings, tz);
}

function getTotalBreakHours(tasks, tz = employeeTimezone) {
  const breaks = getTaskByType(tasks, "break");
  return getHoursForTasks(breaks, tz);
}

function getBreakTimes(tasks, tz = employeeTimezone) {
  const breaks = getTaskByType(tasks, "break");
  return formatTaskTimes(breaks, tz);
}

function getTotalTravelHours(tasks, tz = employeeTimezone) {
  const travel = getTaskByType(tasks, "travel");
  return getHoursForTasks(travel, tz);
}

function getTravelTimes(tasks, tz = employeeTimezone) {
  const travels = getTaskByType(tasks, "travel");
  return formatTaskTimes(travels, tz);
}

function getHoursForTasks(tasks, tz = employeeTimezone) {
  return tasks.reduce((sum, t) => {
    if (t.start_time && t.end_time) {
      return sum + calcHours(t.start_time, t.end_time, tz);
    }
    return sum;
  }, 0);
}

function formatTaskTimes(tasks, tz = employeeTimezone) {
  return tasks.map((t) => {
    const { start_time, end_time } = t;

    if (!start_time || !end_time) return "";

    // Parse times into moment objects in TZ
    const start = moment.tz(start_time, "HH:mm:ss", "UTC").tz(tz);
    const end = moment.tz(end_time, "HH:mm:ss", "UTC").tz(tz);

    // Use your existing calcHours()
    const sum = calcHours(start_time, end_time, tz);

    return `${start.format("HH:mm")} – ${end.format("HH:mm")} (${toHM(sum)})`;
  });
}

function calcHours(start, end, tz = employeeTimezone) {
  if (!start || !end) return 0;
  const s = moment.tz(start, "HH:mm:ss", "UTC").tz(tz);
  const e = moment.tz(end, "HH:mm:ss", "UTC").tz(tz);
  return Math.max(0, e.diff(s, "minutes") / 60);
}

const toHM = (decimalVal) => {
  if (decimalVal !== 0) {
    const minutes = Math.round(decimalVal * 60);
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0 && m === 0) {
      return null;
    }
    return `${h}h ${m}m`;
  }
  return null;
};

function getTaskByType(tasks, type) {
  if (type === "work") {
    return tasks.filter(
      (t) => t.job_id !== null && !t.is_break && !t.is_travel
    );
  } else if (type === "travel") {
    return tasks.filter((t) => t.is_travel);
  } else if (type === "break") {
    return tasks.filter((t) => t.is_break && !t.is_travel);
  }
  if (type === "all") {
    return tasks;
  }
  return tasks;
}

function compare(
  field,
  comparison,
  comparisonName,
  fieldType,
  value,
  from,
  to,
  tasks,
  rate,
  tz
) {
  // Number-based comparison (decimal hours, numeric fields)
  if (fieldType === "time") {
    const fromM = from ? moment.tz(from, "HH:mm", tz) : null;
    const toM = to ? moment.tz(to, "HH:mm", tz) : null;
    const valueM = value ? moment.tz(value, "HH:mm", tz) : null;

    if (field === "start-time") {
      comparison = "equal-to";
    }
    let comparisionValue = null;
    switch (comparison) {
      case "equal-to":
        for (const task of tasks) {
          if (!task.start_time && !task.end_time) continue;

          const taskStart = moment
            .tz(task.start_time, "HH:mm:ss", "UTC")
            .tz(tz);

          const taskEnd = moment.tz(task.end_time, "HH:mm:ss", "UTC").tz(tz);

          // if (taskStart.isSame(valueM)) {
          //   return true;
          // }
          comparisionValue = getComparisonValue({
            task_start: taskStart,
            task_end: taskEnd,
            comparison: "equal to",
            comparison_code: "equal-to",
            from: null,
            to: null,
            value: valueM,
            rate: rate,
            field_type: fieldType,
          });
          return {
            ...comparisionValue,
            condition_matched: taskStart.isSame(valueM) || false,
          };
        }
        return false;
      case "between":
        for (const task of tasks) {
          if (!task.start_time && !task.end_time) continue;

          const taskStart = moment
            .tz(task.start_time, "HH:mm:ss", "UTC")
            .tz(tz);
          const taskEnd = moment.tz(task.end_time, "HH:mm:ss", "UTC").tz(tz);

          // Return true immediately if ANY task matches
          // if (taskStart.isSameOrAfter(fromM) && taskEnd.isSameOrBefore(toM)) {
          //   return true;
          // }
          comparisionValue = getComparisonValue({
            task_start: taskStart,
            task_end: taskEnd,
            comparison: comparisonName,
            comparison_code: comparison,
            from: fromM,
            to: toM,
            value: null,
            rate: rate,
            field_type: fieldType,
          });

          return {
            ...comparisionValue,
            condition_matched:
              (taskStart.isSameOrAfter(fromM) && taskEnd.isSameOrBefore(toM)) ||
              false,
          };
        }
        return false;
      case "not-between":
        for (const task of tasks) {
          if (!task.start_time && !task.end_time) continue;

          const taskStart = moment
            .tz(task.start_time, "HH:mm:ss", "UTC")
            .tz(tz);
          const taskEnd = moment.tz(task.end_time, "HH:mm:ss", "UTC").tz(tz);

          // Return true immediately if ANY task is outside range
          // if (taskStart.isBefore(fromM) || taskEnd.isAfter(toM)) {
          //   return true;
          // }
          comparisionValue = getComparisonValue({
            task_start: taskStart,
            task_end: taskEnd,
            comparison: "equal to",
            comparison_code: "equal-to",
            from: null,
            to: null,
            value: valueM,
            rate: rate,
            field_type: fieldType,
          });
          return {
            ...comparisionValue,
            condition_matched:
              (taskStart.isBefore(fromM) && taskEnd.isAfter(toM)) || false,
          };
        }
        return false;
      default:
        return false;
    }
  } else {
    const fromM = parseFloat(from);
    const toM = parseFloat(to);
    const valueM = parseFloat(value);
    let taskTotalhours = 0;
    let firstTravelTripTaskTime = null;
    let lastTravelTripTaskTime = null;
    if (
      field === "first-travel-trip-time" ||
      field === "last-travel-trip-time"
    ) {
      if (field === "first-travel-trip-time") {
        taskTotalhours = getFirstTravelTripTotalHours(tasks, tz);
        firstTravelTripTaskTime = getFirstTravelTripTaskTime(tasks, tz);
      }
      if (field === "last-travel-trip-time") {
        taskTotalhours = getLastTravelTripTotalHours(tasks, tz);
        lastTravelTripTaskTime = getLastTravelTripTaskTime(tasks, tz);
      }
    } else {
      for (const task of tasks) {
        if (!task.start_time && !task.end_time) {
          continue;
        }
        taskTotalhours += calcHours(task.start_time, task.end_time, tz);
      }
    }
    let comparisionValue = null;
    let taskTimes = [];
    switch (comparison) {
      case "equal-to":
        // return taskTotalhours === valueM;
        taskTimes = getTaskTimes(tasks, tz);
        comparisionValue = getComparisonValue({
          task_start: firstTravelTripTaskTime,
          task_end: null,
          task_total_hours: taskTotalhours,
          comparison: comparisonName,
          comparison_code: comparison,
          from: null,
          to: null,
          value: valueM,
          rate: rate,
          field_type: fieldType,
        });
        return {
          ...comparisionValue,
          task_times:
            firstTravelTripTaskTime || lastTravelTripTaskTime
              ? null
              : taskTimes,
          task_time: firstTravelTripTaskTime
            ? `${firstTravelTripTaskTime.start_time} - ${firstTravelTripTaskTime.end_time}`
            : null || lastTravelTripTaskTime
              ? `${lastTravelTripTaskTime.start_time} - ${lastTravelTripTaskTime.end_time}`
              : null,
          task_total_hours: taskTotalhours,
          condition_matched: taskTotalhours === valueM || false,
        };
      case "not-equal-to":
        // return taskTotalhours !== valueM;
        taskTimes = getTaskTimes(tasks, tz);
        comparisionValue = getComparisonValue({
          task_start: null,
          task_end: null,
          task_total_hours: taskTotalhours,
          comparison: comparisonName,
          comparison_code: comparison,
          from: null,
          to: null,
          value: valueM,
          rate: rate,
          field_type: fieldType,
        });
        return {
          ...comparisionValue,
          task_times:
            firstTravelTripTaskTime || lastTravelTripTaskTime
              ? null
              : taskTimes,
          task_time: firstTravelTripTaskTime
            ? `${firstTravelTripTaskTime.start_time} - ${firstTravelTripTaskTime.end_time}`
            : null || lastTravelTripTaskTime
              ? `${lastTravelTripTaskTime.start_time} - ${lastTravelTripTaskTime.end_time}`
              : null,
          task_total_hours: taskTotalhours,
          condition_matched: taskTotalhours !== valueM || false,
        };
      case "greater-than":
        // return taskTotalhours > valueM;
        taskTimes = getTaskTimes(tasks, tz);
        comparisionValue = getComparisonValue({
          task_start: null,
          task_end: null,
          task_total_hours: taskTotalhours,
          comparison: comparisonName,
          comparison_code: comparison,
          from: null,
          to: null,
          value: valueM,
          rate: rate,
          field_type: fieldType,
        });
        return {
          ...comparisionValue,
          task_times:
            firstTravelTripTaskTime || lastTravelTripTaskTime
              ? null
              : taskTimes,
          task_time: firstTravelTripTaskTime
            ? `${firstTravelTripTaskTime.start_time} - ${firstTravelTripTaskTime.end_time}`
            : null || lastTravelTripTaskTime
              ? `${lastTravelTripTaskTime.start_time} - ${lastTravelTripTaskTime.end_time}`
              : null,
          task_total_hours: taskTotalhours,
          condition_matched: taskTotalhours > valueM || false,
        };
      case "greater-than-or-equal-to":
        // return taskTotalhours >= valueM;
        taskTimes = getTaskTimes(tasks, tz);
        comparisionValue = getComparisonValue({
          task_start: null,
          task_end: null,
          task_total_hours: taskTotalhours,
          comparison: comparisonName,
          comparison_code: comparison,
          from: null,
          to: null,
          value: valueM,
          rate: rate,
          field_type: fieldType,
        });
        return {
          ...comparisionValue,
          task_times:
            firstTravelTripTaskTime || lastTravelTripTaskTime
              ? null
              : taskTimes,
          task_time: firstTravelTripTaskTime
            ? `${firstTravelTripTaskTime.start_time} - ${firstTravelTripTaskTime.end_time}`
            : null || lastTravelTripTaskTime
              ? `${lastTravelTripTaskTime.start_time} - ${lastTravelTripTaskTime.end_time}`
              : null,
          task_total_hours: taskTotalhours,
          condition_matched: taskTotalhours >= valueM || false,
        };
      case "less-than":
        // return taskTotalhours < valueM;
        taskTimes = getTaskTimes(tasks, tz);
        comparisionValue = getComparisonValue({
          task_start: null,
          task_end: null,
          task_total_hours: taskTotalhours,
          comparison: comparisonName,
          comparison_code: comparison,
          from: null,
          to: null,
          value: valueM,
          rate: rate,
          field_type: fieldType,
        });
        return {
          ...comparisionValue,
          task_times:
            firstTravelTripTaskTime || lastTravelTripTaskTime
              ? null
              : taskTimes,
          task_time: firstTravelTripTaskTime
            ? `${firstTravelTripTaskTime.start_time} - ${firstTravelTripTaskTime.end_time}`
            : null || lastTravelTripTaskTime
              ? `${lastTravelTripTaskTime.start_time} - ${lastTravelTripTaskTime.end_time}`
              : null,
          task_total_hours: taskTotalhours,
          condition_matched: taskTotalhours < valueM || false,
        };
      case "less-than-or-equal-to":
        // return taskTotalhours <= valueM;
        taskTimes = getTaskTimes(tasks, tz);
        comparisionValue = getComparisonValue({
          task_start: null,
          task_end: null,
          task_total_hours: taskTotalhours,
          comparison: comparisonName,
          comparison_code: comparison,
          from: null,
          to: null,
          value: valueM,
          rate: rate,
          field_type: fieldType,
        });
        return {
          ...comparisionValue,
          task_times:
            firstTravelTripTaskTime || lastTravelTripTaskTime
              ? null
              : taskTimes,
          task_time: firstTravelTripTaskTime
            ? `${firstTravelTripTaskTime.start_time} - ${firstTravelTripTaskTime.end_time}`
            : null || lastTravelTripTaskTime
              ? `${lastTravelTripTaskTime.start_time} - ${lastTravelTripTaskTime.end_time}`
              : null,
          task_total_hours: taskTotalhours,
          condition_matched: taskTotalhours <= valueM || false,
        };
      case "between":
        // return taskTotalhours >= fromM && taskTotalhours <= toM;
        taskTimes = getTaskTimes(tasks, tz);
        comparisionValue = getComparisonValue({
          task_start: null,
          task_end: null,
          task_total_hours: taskTotalhours,
          comparison: comparisonName,
          comparison_code: comparison,
          from: fromM,
          to: toM,
          value: null,
          rate: rate,
          field_type: fieldType,
        });
        return {
          ...comparisionValue,
          task_times:
            firstTravelTripTaskTime || lastTravelTripTaskTime
              ? null
              : taskTimes,
          task_time: firstTravelTripTaskTime
            ? `${firstTravelTripTaskTime.start_time} - ${firstTravelTripTaskTime.end_time}`
            : null || lastTravelTripTaskTime
              ? `${lastTravelTripTaskTime.start_time} - ${lastTravelTripTaskTime.end_time}`
              : null,
          task_total_hours: taskTotalhours,
          condition_matched:
            (taskTotalhours >= fromM && taskTotalhours <= toM) || false,
        };
      case "not-between":
        // return taskTotalhours < fromM || taskTotalhours > toM;
        taskTimes = getTaskTimes(tasks, tz);
        comparisionValue = getComparisonValue({
          task_start: null,
          task_end: null,
          task_total_hours: taskTotalhours,
          comparison: comparisonName,
          comparison_code: comparison,
          from: fromM,
          to: toM,
          value: null,
          rate: rate,
          field_type: fieldType,
        });
        return {
          ...comparisionValue,
          task_times:
            firstTravelTripTaskTime || lastTravelTripTaskTime
              ? null
              : taskTimes,
          task_time: firstTravelTripTaskTime
            ? `${firstTravelTripTaskTime.start_time} - ${firstTravelTripTaskTime.end_time}`
            : null || lastTravelTripTaskTime
              ? `${lastTravelTripTaskTime.start_time} - ${lastTravelTripTaskTime.end_time}`
              : null,
          task_total_hours: taskTotalhours,
          condition_matched: taskTotalhours < fromM || taskTotalhours > toM,
        };
      default:
        return null;
    }
  }
  return null;
}

function getFirstTravelTripTotalHours(tasks, tz) {
  const tr = (tasks || [])
    .filter((t) => t.is_travel && t.start_time && t.end_time)
    .slice()
    .sort((a, b) =>
      moment
        .tz(a.start_time, "HH:mm:ss", "UTC")
        .tz(tz)
        .isBefore(moment.tz(b.start_time, "HH:mm:ss", "UTC").tz(tz))
        ? -1
        : 1
    );
  if (!tr.length) return 0;
  return calcHours(tr[0].start_time, tr[0].end_time, tz);
}

function getFirstTravelTripTaskTime(tasks, tz) {
  const tr = (tasks || [])
    .filter((t) => t.is_travel && t.start_time && t.end_time)
    .slice()
    .sort((a, b) =>
      moment
        .tz(a.start_time, "HH:mm:ss", "UTC")
        .tz(tz)
        .isBefore(moment.tz(b.start_time, "HH:mm:ss", "UTC").tz(tz))
        ? -1
        : 1
    );
  if (!tr.length) return 0;
  return { start_time: tr[0].start_time, end_time: tr[0].end_time };
}

function getLastTravelTripTotalHours(tasks, tz) {
  const tr = (tasks || [])
    .filter((t) => t.is_travel && t.start_time && t.end_time)
    .slice()
    .sort((a, b) =>
      moment
        .tz(a.end_time, "HH:mm:ss", "UTC")
        .tz(tz)
        .isAfter(moment.tz(b.end_time, "HH:mm:ss", "UTC").tz(tz))
        ? -1
        : 1
    );
  if (!tr.length) return 0;
  return calcHours(tr[0].start_time, tr[0].end_time, tz);
}

function getLastTravelTripTaskTime(tasks, tz) {
  const tr = (tasks || [])
    .filter((t) => t.is_travel && t.start_time && t.end_time)
    .slice()
    .sort((a, b) =>
      moment
        .tz(a.end_time, "HH:mm:ss", "UTC")
        .tz(tz)
        .isAfter(moment.tz(b.end_time, "HH:mm:ss", "UTC").tz(tz))
        ? -1
        : 1
    );
  if (!tr.length) return 0;
  return { start_time: tr[0].start_time, end_time: tr[0].end_time };
}

function toFixedTruncWithZeros(num, decimals = 2) {
  const truncated =
    Math.floor(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
  return truncated.toFixed(decimals);
}

function getRuleLabel(ifx, taskType, fieldType, from, to, value) {
  if (
    ifx.comparison.code === "between" ||
    ifx.comparison.code === "no-between"
  ) {
    return `Applies ${ifx.comparison.name.toLowerCase()} ${fieldType === "number" ? toHM(from) : from
      } to ${fieldType === "number" ? toHM(to) : to} (${ifx.field.name})`;
  } else {
    return `Any ${taskType} ${ifx.comparison.name.toLowerCase()} ${fieldType === "number" ? toHM(value) : value
      } (${ifx.field.name})`;
  }
}

function getTaskTimes(tasks, tz) {
  let taskTimes = [];
  for (const task of tasks) {
    if (!task.start_time && !task.end_time) continue;

    const taskStart = moment.tz(task.start_time, "HH:mm:ss", "UTC").tz(tz);
    const taskEnd = moment.tz(task.end_time, "HH:mm:ss", "UTC").tz(tz);
    taskTimes.push({
      task_time: `${taskStart.format("HH:mm")} - ${taskEnd.format("HH:mm")}`,
    });
  }
  return taskTimes;
}

function getComparisonValue(data) {
  const {
    task_start: taskStart,
    task_end: taskEnd,
    task_total_hours: taskTotalhours,
    comparison: comparison,
    comparison_code: comparisonCode,
    from: fromM,
    to: toM,
    value: valueM,
    rate: rate,
    field_type: fieldType,
  } = data;
  if (fieldType === "time") {
    if (comparisonCode !== "between" && comparisonCode !== "not-between") {
      return {
        task_time: `${taskStart.format("HH:mm")} - ${taskEnd.format("HH:mm")}`,
        comparison_label: `Your task start from ${valueM ? valueM.format("HH:mm") : null
          }. If it is ${comparison.toLowerCase()} ${taskStart.format(
            "HH:mm"
          )}, then you will get ${rate?.rate}% (${rate?.name}) for the task.`,
        rate_percent: rate?.rate || null,
        rate_label: rate?.name || null,
      };
    } else {
      return {
        task_time: `${taskStart.format("HH:mm")} - ${taskEnd.format("HH:mm")}`,
        comparison_label: `Your task time is from ${taskStart.format(
          "HH:mm"
        )} to ${taskEnd.format(
          "HH:mm"
        )}. If this time range falls ${comparison.toLowerCase()} ${fromM ? fromM.format("HH:mm") : null
          } and ${toM ? toM.format("HH:mm") : null}, then you will get ${rate?.rate
          }% (${rate?.name}) for the task.`,
        rate_percent: rate?.rate || null,
        rate_label: rate?.name || null,
      };
    }
  } else {
    if (comparisonCode !== "between" && comparisonCode !== "not-between") {
      return {
        comparison_label: `Your total task duration is ${toHM(
          taskTotalhours
        )}. If it is ${comparison.toLowerCase()} ${toHM(
          valueM
        )}, then you will get ${rate?.rate}% (${rate?.name}) for the task.`,
        rate_percent: rate?.rate || null,
        rate_label: rate?.name || null,
      };
    } else {
      return {
        comparison_label: `Your total task duration is ${toHM(
          taskTotalhours
        )}. If it is ${comparison.toLowerCase()} ${toHM(fromM)} to ${toHM(
          toM
        )}, then you will get ${rate?.rate}% (${rate?.name}) for the task.`,
        rate_percent: rate?.rate || null,
        rate_label: rate?.name || null,
      };
    }
  }
}
