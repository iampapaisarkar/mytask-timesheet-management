import moment from "moment";
import { Op } from "sequelize";
import models from "../models/index.js";
import timesheetRateService from "./timesheet-rate.service.js";
import taskUtils from "../utils/task.utils.js";

const {
  Timesheets,
  TimesheetDays,
  TimesheetDayTasks,
  TimesheetStatus,
  Jobs,
  Employees,
  EmployeeWages,
  Users,
  Payouts,
  Organisations,
} = models;

/** Standard working day length for overtime (hours). */
export const STANDARD_DAY_HOURS = 8;

function round2(n) {
  return Number((Number(n) || 0).toFixed(2));
}

function sumHours(tasks, type) {
  return round2(
    taskUtils
      .filterByType(tasks || [], type)
      .reduce((acc, t) => acc + (parseFloat(t.total_hours) || 0), 0),
  );
}

function clockBounds(tasks = []) {
  const times = (tasks || [])
    .filter((t) => t.start_time || t.end_time)
    .flatMap((t) => [t.start_time, t.end_time].filter(Boolean))
    .map((t) => String(t).slice(0, 8))
    .sort();
  if (!times.length) return { clock_in: null, clock_out: null };
  return { clock_in: times[0], clock_out: times[times.length - 1] };
}

/**
 * Load and validate an approved timesheet for report generation.
 */
export async function loadApprovedTimesheetForReport({
  organisationId,
  employeeId,
  timesheetId,
}) {
  const ts = await Timesheets.findOne({
    where: {
      id: timesheetId,
      organisation_id: organisationId,
      employee_id: employeeId,
    },
    include: [
      {
        model: TimesheetStatus,
        as: "status",
        attributes: ["id", "name", "code"],
        required: true,
        where: { code: "approved" },
      },
      {
        model: Jobs,
        as: "jobs",
        attributes: ["id", "name"],
        through: { attributes: [] },
        required: false,
      },
      {
        model: TimesheetDays,
        as: "days",
        required: false,
        include: [
          {
            model: TimesheetDayTasks,
            as: "tasks",
            required: false,
          },
        ],
      },
    ],
    order: [[{ model: TimesheetDays, as: "days" }, "date", "asc"]],
  });
  return ts;
}

/**
 * Build a single approved-timesheet pay report (day / work / amount + paid).
 */
export async function buildApprovedTimesheetReport({
  organisationId,
  employeeId,
  timesheetId,
  onProgress,
}) {
  if (typeof onProgress === "function") onProgress(10);

  const organisation = await Organisations.findByPk(organisationId);
  if (!organisation) {
    throw new Error("Organisation not found");
  }

  const timesheet = await loadApprovedTimesheetForReport({
    organisationId,
    employeeId,
    timesheetId,
  });
  if (!timesheet) {
    throw Object.assign(
      new Error(
        "No approved timesheet found for the selected employee. Only approved timesheets can generate a report.",
      ),
      { statusCode: 400 },
    );
  }

  if (typeof onProgress === "function") onProgress(30);

  const plain = timesheet.toJSON ? timesheet.toJSON() : timesheet;
  const days = Array.isArray(plain.days) ? plain.days : [];

  const emp = await Employees.unscoped().findOne({
    where: { id: employeeId, organisation_id: organisationId },
    attributes: ["id", "preferred_name", "user_id"],
    include: [
      {
        model: Users,
        as: "user",
        attributes: ["id", "first_name", "last_name", "email"],
        required: false,
      },
    ],
  });
  const empPlain = emp?.get({ plain: true }) || {};
  const employeeName =
    [empPlain.user?.first_name, empPlain.user?.last_name]
      .filter(Boolean)
      .join(" ") ||
    empPlain.preferred_name ||
    `Employee #${employeeId}`;

  if (typeof onProgress === "function") onProgress(50);

  const wageRow = await EmployeeWages.findOne({
    where: {
      employee_id: employeeId,
      organisation_id: organisationId,
    },
    attributes: [
      "currency",
      "pay_type",
      "hourly_rate_exc_super",
      "fixed_rate_exc_super",
    ],
  });
  const wagePlain = wageRow?.get
    ? wageRow.get({ plain: true })
    : wageRow || {};

  const rateRows = await timesheetRateService.calculate({
    organisation: { id: organisationId },
    timesheet_id: timesheetId,
    employee_id: employeeId,
    from: plain.period_start_date,
    to: plain.period_end_date,
  });
  const rateByDate = new Map(
    (rateRows || []).map((r) => [String(r.date).slice(0, 10), r]),
  );

  // Prefer wage table currency (source of truth), then rate calc, never silent AUD
  // unless wage truly has no currency set.
  const currency = String(
    wagePlain.currency ||
      rateRows?.[0]?.currency ||
      "AUD",
  ).toUpperCase();

  if (typeof onProgress === "function") onProgress(70);

  const payout = await Payouts.findOne({
    where: {
      organisation_id: organisationId,
      timesheet_id: timesheetId,
      status: { [Op.ne]: "VOID" },
    },
  });
  const payoutPlain = payout?.toJSON ? payout.toJSON() : payout;
  const isPaid = String(payoutPlain?.status || "").toUpperCase() === "PAID";

  const dayRows = days.map((day) => {
    const dateKey = String(day.date || "").slice(0, 10);
    const tasks = Array.isArray(day.tasks) ? day.tasks : [];
    const working = sumHours(tasks, "working");
    const travel = sumHours(tasks, "travel");
    const brk = sumHours(tasks, "break");
    const overtime = round2(Math.max(0, working - STANDARD_DAY_HOURS));
    const { clock_in, clock_out } = clockBounds(tasks);
    const rate = rateByDate.get(dateKey);
    const amount = round2(
      rate?.total_payble_amount ?? rate?.total_original_payout_amount ?? 0,
    );
    const notes = tasks
      .map((t) => t.remarks)
      .filter(Boolean)
      .join("; ");

    return {
      date: day.date,
      day_name: day.day_name || rate?.day_name || null,
      is_public_holiday: Boolean(
        day.is_public_holiday ?? rate?.is_public_holiday,
      ),
      clock_in,
      clock_out,
      working_hours: working,
      break_hours: brk,
      travel_hours: travel,
      overtime_hours: overtime,
      amount,
      notes: notes || null,
      working_periods: rate?.working_periods || [],
    };
  });

  const totals = {
    working_hours: round2(dayRows.reduce((a, d) => a + d.working_hours, 0)),
    break_hours: round2(dayRows.reduce((a, d) => a + d.break_hours, 0)),
    travel_hours: round2(dayRows.reduce((a, d) => a + d.travel_hours, 0)),
    overtime_hours: round2(dayRows.reduce((a, d) => a + d.overtime_hours, 0)),
    days_worked: dayRows.filter((d) => d.working_hours > 0).length,
    amount: round2(dayRows.reduce((a, d) => a + d.amount, 0)),
  };

  if (typeof onProgress === "function") onProgress(100);

  return {
    generated_at: moment().toISOString(),
    type: "approved_timesheet",
    currency,
    employee: {
      employee_id: Number(employeeId),
      name: employeeName,
      email: empPlain.user?.email || null,
      code: `EMP-${employeeId}`,
    },
    timesheet: {
      timesheet_id: plain.id,
      code: plain.code,
      status: plain.status || null,
      period: plain.period_range || {
        start: plain.period_start_date,
        end: plain.period_end_date,
      },
      period_start_date: plain.period_start_date,
      period_end_date: plain.period_end_date,
      jobs: (plain.jobs || []).map((j) => ({ id: j.id, name: j.name })),
    },
    days: dayRows,
    totals,
    pay_cycle: {
      total_amount: totals.amount,
      currency,
      payout_status: payoutPlain?.status || null,
      is_paid: isPaid,
      paid_label: isPaid ? "Paid" : "Not paid",
      paid_at: payoutPlain?.paid_at || null,
      payout_amount:
        payoutPlain?.amount != null ? round2(payoutPlain.amount) : null,
    },
    standard_day_hours: STANDARD_DAY_HOURS,
  };
}

/** @deprecated Prefer buildApprovedTimesheetReport */
export async function buildHoursActivityReport(args) {
  const employeeId = args.employeeIds?.[0] || args.filters?.employee_id;
  const timesheetId =
    args.filters?.timesheet_id || args.filters?.timesheet_ids?.[0];
  return buildApprovedTimesheetReport({
    organisationId: args.organisationId,
    employeeId: Number(employeeId),
    timesheetId: Number(timesheetId),
    onProgress: args.onProgress,
  });
}

/**
 * List approved timesheets for an employee (report filter).
 */
export async function listScopedTimesheets({
  organisationId,
  employeeIds,
  employeeId,
  limit = 100,
}) {
  if (!employeeId) return [];
  const ids = employeeIds.filter((id) => Number(id) === Number(employeeId));
  if (!ids.length) return [];

  const rows = await Timesheets.findAll({
    where: {
      organisation_id: organisationId,
      employee_id: { [Op.in]: ids },
    },
    include: [
      {
        model: TimesheetStatus,
        as: "status",
        attributes: ["id", "name", "code"],
        where: { code: "approved" },
        required: true,
      },
      {
        model: Jobs,
        as: "jobs",
        attributes: ["id", "name"],
        through: { attributes: [] },
        required: false,
      },
    ],
    order: [["period_start_date", "desc"]],
    limit: Math.min(Number(limit) || 100, 500),
  });

  return rows.map((r) => {
    const p = r.toJSON();
    return {
      id: p.id,
      code: p.code,
      employee_id: p.employee_id,
      period_range: p.period_range,
      period_start_date: p.period_start_date,
      period_end_date: p.period_end_date,
      status: p.status,
      jobs: p.jobs || [],
    };
  });
}

export default {
  STANDARD_DAY_HOURS,
  buildApprovedTimesheetReport,
  buildHoursActivityReport,
  listScopedTimesheets,
  loadApprovedTimesheetForReport,
};
