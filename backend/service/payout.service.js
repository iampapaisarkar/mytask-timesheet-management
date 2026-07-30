import { Op } from "sequelize";
import moment from "moment";
import models from "../models/index.js";
import timesheetRateService from "./timesheet-rate.service.js";

const {
  Users,
  Employees,
  EmployeePayrolls,
  EmployeeWages,
  Timesheets,
  TimesheetStatus,
  Payouts,
} = models;

class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

const ACTIVE_PAYOUT_STATUSES = ["ELIGIBLE", "PAID"];

const employeeInclude = {
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
    },
    {
      model: EmployeeWages,
      as: "wage",
      attributes: ["currency", "pay_type", "hourly_rate_exc_super", "fixed_rate_exc_super"],
      required: false,
    },
  ],
};

const timesheetInclude = {
  model: Timesheets,
  as: "timesheet",
  attributes: [
    "id",
    "code",
    "period_start_date",
    "period_end_date",
    "employee_id",
    "status_id",
  ],
};

function resolveTimesheetAmountSnapshot(timesheet) {
  const candidates = [
    timesheet?.total_payble_amount,
    timesheet?.total_payable_amount,
    timesheet?.total_amount,
    timesheet?.total_original_payout_amount,
  ];
  for (const value of candidates) {
    if (value == null || value === "") continue;
    const num = Number(value);
    if (!Number.isNaN(num)) return Number(num.toFixed(2));
  }
  return null;
}

async function computeAmount(organisation, timesheet) {
  const snapshot = resolveTimesheetAmountSnapshot(timesheet);
  if (snapshot != null) return snapshot;

  const days = await timesheetRateService.calculate({
    organisation,
    timesheet_id: timesheet.id,
    employee_id: timesheet.employee_id,
    from: timesheet.period_start_date,
    to: timesheet.period_end_date,
  });

  const sum = (days || []).reduce(
    (acc, day) => acc + (Number(day.total_payble_amount) || 0),
    0,
  );
  return Number(sum.toFixed(2));
}

async function getApprovedStatus() {
  const status = await TimesheetStatus.findOne({
    where: { code: "approved" },
    attributes: ["id", "name", "code"],
  });
  if (!status) {
    throw new AppError("Approved timesheet status not found", 500);
  }
  return status;
}

async function listPayouts(organisation) {
  return Payouts.findAll({
    where: { organisation_id: organisation.id },
    include: [employeeInclude, timesheetInclude],
    order: [["id", "DESC"]],
    raw: false,
    nest: true,
  });
}

async function listEligibleTimesheets(organisation) {
  const approvedStatus = await getApprovedStatus();

  const activePayouts = await Payouts.findAll({
    where: {
      organisation_id: organisation.id,
      status: { [Op.in]: ACTIVE_PAYOUT_STATUSES },
    },
    attributes: ["timesheet_id"],
    raw: true,
  });
  const blockedIds = activePayouts.map((row) => row.timesheet_id);

  const where = {
    organisation_id: organisation.id,
    status_id: approvedStatus.id,
  };
  if (blockedIds.length) {
    where.id = { [Op.notIn]: blockedIds };
  }

  return Timesheets.findAll({
    where,
    include: [
      {
        model: TimesheetStatus,
        as: "status",
        attributes: ["id", "name", "code"],
      },
      employeeInclude,
    ],
    order: [["period_end_date", "DESC"], ["id", "DESC"]],
    raw: false,
    nest: true,
  });
}

async function createPayout({ organisation, user, timesheet_id, notes }) {
  if (!timesheet_id) {
    throw new AppError("timesheet_id is required", 400);
  }

  const approvedStatus = await getApprovedStatus();

  const timesheet = await Timesheets.findOne({
    where: {
      id: timesheet_id,
      organisation_id: organisation.id,
    },
    include: [
      {
        model: TimesheetStatus,
        as: "status",
        attributes: ["id", "name", "code"],
      },
      {
        model: Employees.unscoped(),
        as: "employee",
        include: [
          {
            model: EmployeePayrolls,
            as: "payroll",
            attributes: ["payment_method"],
          },
        ],
      },
    ],
  });

  if (!timesheet) {
    throw new AppError("Timesheet not found", 404);
  }

  if (
    timesheet.status_id !== approvedStatus.id &&
    timesheet.status?.code !== "approved"
  ) {
    throw new AppError("Timesheet must be approved before creating a payout", 400);
  }

  const existing = await Payouts.findOne({
    where: {
      organisation_id: organisation.id,
      timesheet_id: timesheet.id,
      status: { [Op.in]: ACTIVE_PAYOUT_STATUSES },
    },
  });
  if (existing) {
    throw new AppError("A payout already exists for this timesheet", 400);
  }

  const amount = await computeAmount(organisation, timesheet);
  const paymentMethod =
    timesheet.employee?.payroll?.payment_method || null;
  const now = moment().utc().format();

  const payout = await Payouts.create({
    organisation_id: organisation.id,
    employee_id: timesheet.employee_id,
    timesheet_id: timesheet.id,
    amount,
    status: "ELIGIBLE",
    payment_method: paymentMethod,
    paid_at: null,
    notes: notes || null,
    created_at: now,
    created_by: user?.id || null,
    updated_at: now,
    updated_by: user?.id || null,
  });

  return Payouts.findOne({
    where: { id: payout.id, organisation_id: organisation.id },
    include: [employeeInclude, timesheetInclude],
    raw: false,
    nest: true,
  });
}

async function markPaid({ organisation, user, id }) {
  const payout = await Payouts.findOne({
    where: {
      id,
      organisation_id: organisation.id,
    },
  });

  if (!payout) {
    throw new AppError("Payout not found", 404);
  }

  if (payout.status === "PAID") {
    throw new AppError("Payout is already marked as paid", 400);
  }

  if (payout.status !== "ELIGIBLE") {
    throw new AppError("Only ELIGIBLE payouts can be marked as paid", 400);
  }

  const now = moment().utc().format();
  await payout.update({
    status: "PAID",
    paid_at: now,
    updated_at: now,
    updated_by: user?.id || null,
  });

  return Payouts.findOne({
    where: { id: payout.id, organisation_id: organisation.id },
    include: [employeeInclude, timesheetInclude],
    raw: false,
    nest: true,
  });
}

export default {
  listPayouts,
  listEligibleTimesheets,
  createPayout,
  markPaid,
  AppError,
};
