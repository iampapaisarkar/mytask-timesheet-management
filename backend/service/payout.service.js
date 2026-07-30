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
  PayoutEvents,
} = models;

class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

/** Canonical enterprise statuses */
export const PAYOUT_STATUS = {
  DRAFT: "DRAFT",
  PENDING_APPROVAL: "PENDING_APPROVAL",
  APPROVED: "APPROVED",
  READY_FOR_PAYOUT: "READY_FOR_PAYOUT",
  PAID: "PAID",
  CANCELLED: "CANCELLED",
};

/** Statuses that block another payout for the same timesheet */
const BLOCKING_STATUSES = [
  PAYOUT_STATUS.DRAFT,
  PAYOUT_STATUS.PENDING_APPROVAL,
  PAYOUT_STATUS.APPROVED,
  PAYOUT_STATUS.READY_FOR_PAYOUT,
  PAYOUT_STATUS.PAID,
  "ELIGIBLE", // legacy
];

const TRANSITIONS = {
  [PAYOUT_STATUS.DRAFT]: [
    PAYOUT_STATUS.PENDING_APPROVAL,
    PAYOUT_STATUS.READY_FOR_PAYOUT,
    PAYOUT_STATUS.CANCELLED,
  ],
  [PAYOUT_STATUS.PENDING_APPROVAL]: [
    PAYOUT_STATUS.APPROVED,
    PAYOUT_STATUS.DRAFT,
    PAYOUT_STATUS.CANCELLED,
  ],
  [PAYOUT_STATUS.APPROVED]: [
    PAYOUT_STATUS.READY_FOR_PAYOUT,
    PAYOUT_STATUS.CANCELLED,
  ],
  [PAYOUT_STATUS.READY_FOR_PAYOUT]: [
    PAYOUT_STATUS.PAID,
    PAYOUT_STATUS.CANCELLED,
  ],
  ELIGIBLE: [PAYOUT_STATUS.PAID, PAYOUT_STATUS.CANCELLED],
  [PAYOUT_STATUS.PAID]: [],
  [PAYOUT_STATUS.CANCELLED]: [],
  VOID: [],
};

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
      attributes: [
        "currency",
        "pay_type",
        "hourly_rate_exc_super",
        "fixed_rate_exc_super",
      ],
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
    "payroll_calendar_id",
  ],
};

function normalizeStatus(status) {
  if (status === "ELIGIBLE") return PAYOUT_STATUS.READY_FOR_PAYOUT;
  if (status === "VOID") return PAYOUT_STATUS.CANCELLED;
  return status;
}

function computeNet({
  gross_amount,
  deductions = 0,
  bonuses = 0,
  adjustments = 0,
  tax_amount = 0,
}) {
  const net =
    Number(gross_amount || 0) -
    Number(deductions || 0) +
    Number(bonuses || 0) +
    Number(adjustments || 0) -
    Number(tax_amount || 0);
  return Number(net.toFixed(2));
}

async function recordEvent({
  organisationId,
  payoutId,
  action,
  previousStatus,
  newStatus,
  previousValue,
  newValue,
  notes,
  userId,
}) {
  if (!PayoutEvents) return;
  await PayoutEvents.create({
    organisation_id: organisationId,
    payout_id: payoutId,
    action,
    previous_status: previousStatus || null,
    new_status: newStatus || null,
    previous_value: previousValue
      ? JSON.stringify(previousValue)
      : null,
    new_value: newValue ? JSON.stringify(newValue) : null,
    notes: notes || null,
    created_at: moment().utc().format(),
    created_by: userId || null,
  });
}

async function assertTransition(from, to) {
  const allowed = TRANSITIONS[from] || TRANSITIONS[normalizeStatus(from)] || [];
  if (!allowed.includes(to)) {
    throw new AppError(
      `Invalid payout status transition: ${from} → ${to}`,
      400,
    );
  }
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

async function buildSnapshot(organisation, timesheet) {
  const summary = await timesheetRateService.summarizePeriod({
    organisation,
    timesheet_id: timesheet.id,
    employee_id: timesheet.employee_id,
    from: timesheet.period_start_date,
    to: timesheet.period_end_date,
  });

  const deductions = 0;
  const bonuses = 0;
  const adjustments = 0;
  const tax_amount = 0;
  const net_amount = computeNet({
    gross_amount: summary.gross_amount,
    deductions,
    bonuses,
    adjustments,
    tax_amount,
  });

  return {
    ...summary,
    deductions,
    bonuses,
    adjustments,
    tax_amount,
    net_amount,
    amount: net_amount,
  };
}

function selfEmployeeId(organisation) {
  return organisation?.employee?.id
    ? Number(organisation.employee.id)
    : null;
}

async function resolveManagerStaffIds(organisation) {
  if (organisation?.role?.code !== "manager") return null;
  const employees = await Employees.unscoped().findAll({
    where: {
      organisation_id: organisation.id,
      ...(organisation?.employee?.id
        ? { id: { [Op.ne]: organisation.employee.id } }
        : {}),
    },
    attributes: ["id"],
    raw: true,
  });
  return employees.map((e) => Number(e.id));
}

async function listPayouts(organisation, filters = {}) {
  const where = { organisation_id: organisation.id };
  const role = organisation?.role?.code;

  // Staff: own payouts only; manager: assigned employees
  if (role === "staff") {
    const eid = selfEmployeeId(organisation);
    if (!eid) return [];
    where.employee_id = eid;
  } else if (role === "manager") {
    const staffIds = await resolveManagerStaffIds(organisation);
    if (!staffIds?.length) return [];
    if (filters.employee_id) {
      const eid = Number(filters.employee_id);
      if (!staffIds.includes(eid)) return [];
      where.employee_id = eid;
    } else {
      where.employee_id = { [Op.in]: staffIds };
    }
  } else if (filters.employee_id) {
    where.employee_id = Number(filters.employee_id);
  }

  if (filters.status) {
    const statuses = String(filters.status)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (statuses.length === 1 && statuses[0] === "ELIGIBLE") {
      where.status = {
        [Op.in]: ["ELIGIBLE", PAYOUT_STATUS.READY_FOR_PAYOUT],
      };
    } else if (statuses.length) {
      where.status = { [Op.in]: statuses };
    }
  }

  if (filters.from || filters.to) {
    where.created_at = {};
    if (filters.from) {
      where.created_at[Op.gte] = moment(filters.from).startOf("day").toDate();
    }
    if (filters.to) {
      where.created_at[Op.lte] = moment(filters.to).endOf("day").toDate();
    }
  }

  if (filters.search) {
    // resolved after join via employee name is harder in SQL; filter in memory lightly
  }

  const rows = await Payouts.findAll({
    where,
    include: [employeeInclude, timesheetInclude],
    order: [["id", "DESC"]],
    limit: Math.min(Number(filters.limit) || 200, 500),
    offset: Math.max(Number(filters.offset) || 0, 0),
    raw: false,
    nest: true,
  });

  const search = String(filters.search || "")
    .trim()
    .toLowerCase();
  if (!search) return rows;

  return rows.filter((row) => {
    const plain = row.toJSON ? row.toJSON() : row;
    const name =
      plain.employee?.user?.full_name ||
      plain.employee?.details?.full_name ||
      "";
    const number = plain.payout_number || "";
    const code = plain.timesheet?.code || "";
    return (
      name.toLowerCase().includes(search) ||
      number.toLowerCase().includes(search) ||
      code.toLowerCase().includes(search) ||
      String(plain.id).includes(search)
    );
  });
}

async function getPayout(organisation, id) {
  const where = {
    id,
    organisation_id: organisation.id,
  };
  if (organisation?.role?.code === "staff") {
    const eid = selfEmployeeId(organisation);
    if (!eid) throw new AppError("Payout not found", 404);
    where.employee_id = eid;
  }

  const payout = await Payouts.findOne({
    where,
    include: [
      employeeInclude,
      timesheetInclude,
      {
        model: PayoutEvents,
        as: "events",
        required: false,
        separate: true,
        order: [["id", "ASC"]],
      },
    ],
    raw: false,
    nest: true,
  });
  if (!payout) throw new AppError("Payout not found", 404);
  return payout;
}

async function listEligibleTimesheets(organisation) {
  const approvedStatus = await getApprovedStatus();

  const activePayouts = await Payouts.findAll({
    where: {
      organisation_id: organisation.id,
      status: { [Op.in]: BLOCKING_STATUSES },
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
    order: [
      ["period_end_date", "DESC"],
      ["id", "DESC"],
    ],
    raw: false,
    nest: true,
  });
}

async function createPayout({
  organisation,
  user,
  timesheet_id,
  notes,
  as_draft = false,
  deductions = 0,
  bonuses = 0,
  adjustments = 0,
  tax_amount = 0,
  pay_date = null,
}) {
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
    throw new AppError(
      "Timesheet must be approved before creating a payout",
      400,
    );
  }

  const existing = await Payouts.findOne({
    where: {
      organisation_id: organisation.id,
      timesheet_id: timesheet.id,
      status: { [Op.in]: BLOCKING_STATUSES },
    },
  });
  if (existing) {
    throw new AppError(
      "A payout already exists for this timesheet / payroll period",
      400,
    );
  }

  const snapshot = await buildSnapshot(organisation, timesheet);
  const gross = snapshot.gross_amount;
  const net = computeNet({
    gross_amount: gross,
    deductions,
    bonuses,
    adjustments,
    tax_amount,
  });

  const paymentMethod =
    timesheet.employee?.payroll?.payment_method || null;
  const now = moment().utc().format();
  const status = as_draft
    ? PAYOUT_STATUS.DRAFT
    : PAYOUT_STATUS.READY_FOR_PAYOUT;

  const payout = await Payouts.create({
    organisation_id: organisation.id,
    employee_id: timesheet.employee_id,
    timesheet_id: timesheet.id,
    payout_number: null,
    amount: net,
    status,
    payment_method: paymentMethod,
    pay_date: pay_date || timesheet.period_end_date || null,
    period_start_date: timesheet.period_start_date || null,
    period_end_date: timesheet.period_end_date || null,
    currency: snapshot.currency,
    worked_hours: snapshot.worked_hours,
    regular_hours: snapshot.regular_hours,
    overtime_hours: snapshot.overtime_hours,
    hourly_rate: snapshot.hourly_rate,
    gross_amount: gross,
    deductions: Number(deductions) || 0,
    bonuses: Number(bonuses) || 0,
    adjustments: Number(adjustments) || 0,
    tax_amount: Number(tax_amount) || 0,
    net_amount: net,
    paid_at: null,
    notes: notes || null,
    created_at: now,
    created_by: user?.id || null,
    updated_at: now,
    updated_by: user?.id || null,
  });

  const payoutNumber = `PO-${String(payout.id).padStart(6, "0")}`;
  await payout.update({ payout_number: payoutNumber });

  await recordEvent({
    organisationId: organisation.id,
    payoutId: payout.id,
    action: "create",
    previousStatus: null,
    newStatus: status,
    newValue: { amount: net, gross_amount: gross },
    notes,
    userId: user?.id,
  });

  return getPayout(organisation, payout.id);
}

async function transitionPayout({
  organisation,
  user,
  id,
  toStatus,
  action,
  notes,
  extra = {},
}) {
  const payout = await Payouts.findOne({
    where: { id, organisation_id: organisation.id },
  });
  if (!payout) throw new AppError("Payout not found", 404);

  const from = payout.status;
  await assertTransition(from, toStatus);

  const previous = payout.toJSON();
  const now = moment().utc().format();
  const patch = {
    status: toStatus,
    updated_at: now,
    updated_by: user?.id || null,
    ...extra,
  };

  await payout.update(patch);

  await recordEvent({
    organisationId: organisation.id,
    payoutId: payout.id,
    action,
    previousStatus: from,
    newStatus: toStatus,
    previousValue: { status: from },
    newValue: { status: toStatus, ...extra },
    notes,
    userId: user?.id,
  });

  return getPayout(organisation, payout.id);
}

async function submitForApproval({ organisation, user, id, notes }) {
  return transitionPayout({
    organisation,
    user,
    id,
    toStatus: PAYOUT_STATUS.PENDING_APPROVAL,
    action: "submit",
    notes,
  });
}

async function approve({ organisation, user, id, notes }) {
  return transitionPayout({
    organisation,
    user,
    id,
    toStatus: PAYOUT_STATUS.APPROVED,
    action: "approve",
    notes,
    extra: {
      approved_by: user?.id || null,
      approved_at: moment().utc().format(),
    },
  });
}

async function release({ organisation, user, id, notes }) {
  return transitionPayout({
    organisation,
    user,
    id,
    toStatus: PAYOUT_STATUS.READY_FOR_PAYOUT,
    action: "release",
    notes,
  });
}

async function markPaid({ organisation, user, id, notes }) {
  const payout = await Payouts.findOne({
    where: { id, organisation_id: organisation.id },
  });
  if (!payout) throw new AppError("Payout not found", 404);

  const from = normalizeStatus(payout.status);
  if (from === PAYOUT_STATUS.PAID) {
    throw new AppError("Payout is already marked as paid", 400);
  }
  if (
    from !== PAYOUT_STATUS.READY_FOR_PAYOUT &&
    payout.status !== "ELIGIBLE"
  ) {
    throw new AppError(
      "Only READY_FOR_PAYOUT payouts can be marked as paid",
      400,
    );
  }

  return transitionPayout({
    organisation,
    user,
    id,
    toStatus: PAYOUT_STATUS.PAID,
    action: "mark_paid",
    notes,
    extra: {
      paid_at: moment().utc().format(),
      pay_date:
        payout.pay_date || moment().utc().format("YYYY-MM-DD"),
    },
  });
}

async function cancel({ organisation, user, id, notes }) {
  const payout = await Payouts.findOne({
    where: { id, organisation_id: organisation.id },
  });
  if (!payout) throw new AppError("Payout not found", 404);
  if (normalizeStatus(payout.status) === PAYOUT_STATUS.PAID) {
    throw new AppError("Paid payouts cannot be cancelled", 400);
  }
  return transitionPayout({
    organisation,
    user,
    id,
    toStatus: PAYOUT_STATUS.CANCELLED,
    action: "cancel",
    notes,
  });
}

async function updateAmounts({
  organisation,
  user,
  id,
  deductions,
  bonuses,
  adjustments,
  tax_amount,
  notes,
}) {
  const payout = await Payouts.findOne({
    where: { id, organisation_id: organisation.id },
  });
  if (!payout) throw new AppError("Payout not found", 404);

  const status = normalizeStatus(payout.status);
  if (
    ![
      PAYOUT_STATUS.DRAFT,
      PAYOUT_STATUS.PENDING_APPROVAL,
      PAYOUT_STATUS.APPROVED,
      PAYOUT_STATUS.READY_FOR_PAYOUT,
    ].includes(status) &&
    payout.status !== "ELIGIBLE"
  ) {
    throw new AppError("Cannot adjust amounts in the current status", 400);
  }

  const previous = {
    deductions: payout.deductions,
    bonuses: payout.bonuses,
    adjustments: payout.adjustments,
    tax_amount: payout.tax_amount,
    net_amount: payout.net_amount,
  };

  const next = {
    deductions:
      deductions != null ? Number(deductions) : Number(payout.deductions) || 0,
    bonuses: bonuses != null ? Number(bonuses) : Number(payout.bonuses) || 0,
    adjustments:
      adjustments != null
        ? Number(adjustments)
        : Number(payout.adjustments) || 0,
    tax_amount:
      tax_amount != null ? Number(tax_amount) : Number(payout.tax_amount) || 0,
  };
  const net = computeNet({
    gross_amount: payout.gross_amount ?? payout.amount,
    ...next,
  });

  await payout.update({
    ...next,
    net_amount: net,
    amount: net,
    notes: notes != null ? notes : payout.notes,
    updated_at: moment().utc().format(),
    updated_by: user?.id || null,
  });

  await recordEvent({
    organisationId: organisation.id,
    payoutId: payout.id,
    action: "adjust",
    previousStatus: payout.status,
    newStatus: payout.status,
    previousValue: previous,
    newValue: { ...next, net_amount: net },
    notes,
    userId: user?.id,
  });

  return getPayout(organisation, payout.id);
}

function toCsv(rows) {
  const headers = [
    "payout_number",
    "status",
    "employee",
    "timesheet_code",
    "period_start",
    "period_end",
    "currency",
    "worked_hours",
    "regular_hours",
    "overtime_hours",
    "hourly_rate",
    "gross_amount",
    "deductions",
    "bonuses",
    "adjustments",
    "tax_amount",
    "net_amount",
    "pay_date",
    "paid_at",
  ];
  const escape = (v) => {
    const s = v == null ? "" : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    const plain = row.toJSON ? row.toJSON() : row;
    const employee =
      plain.employee?.user?.full_name ||
      plain.employee?.details?.full_name ||
      plain.employee_id;
    lines.push(
      [
        plain.payout_number,
        normalizeStatus(plain.status),
        employee,
        plain.timesheet?.code,
        plain.period_start_date || plain.timesheet?.period_start_date,
        plain.period_end_date || plain.timesheet?.period_end_date,
        plain.currency,
        plain.worked_hours,
        plain.regular_hours,
        plain.overtime_hours,
        plain.hourly_rate,
        plain.gross_amount,
        plain.deductions,
        plain.bonuses,
        plain.adjustments,
        plain.tax_amount,
        plain.net_amount ?? plain.amount,
        plain.pay_date,
        plain.paid_at,
      ]
        .map(escape)
        .join(","),
    );
  }
  return lines.join("\n");
}

async function exportCsv(organisation, filters = {}) {
  const rows = await listPayouts(organisation, {
    ...filters,
    limit: 5000,
  });
  return toCsv(rows);
}

async function dashboardPayoutStats(
  organisation,
  employeeScopeIds = null,
  options = {},
) {
  const where = { organisation_id: organisation.id };
  if (employeeScopeIds?.length) {
    where.employee_id = { [Op.in]: employeeScopeIds };
  } else if (employeeScopeIds && employeeScopeIds.length === 0) {
    return {
      draft: 0,
      pending_approval: 0,
      ready: 0,
      paid: 0,
      cancelled: 0,
      paid_amount_month: 0,
      pending_amount: 0,
      status_distribution: [],
      monthly_payroll_trend: [],
    };
  }

  const rows = await Payouts.findAll({
    where,
    attributes: [
      "id",
      "status",
      "amount",
      "net_amount",
      "gross_amount",
      "currency",
      "paid_at",
      "created_at",
    ],
    raw: true,
  });

  const monthStart = moment().startOf("month");
  const counts = {
    draft: 0,
    pending_approval: 0,
    ready: 0,
    paid: 0,
    cancelled: 0,
  };
  let paid_amount_month = 0;
  let pending_amount = 0;
  const trend = {};
  for (let i = 5; i >= 0; i -= 1) {
    const m = moment().subtract(i, "months");
    trend[m.format("YYYY-MM")] = { label: m.format("MMM"), value: 0 };
  }

  const displayCurrency = options.displayCurrency
    ? String(options.displayCurrency).toUpperCase()
    : null;

  let convertMany = null;
  if (displayCurrency) {
    try {
      const currencyService = (await import("./currency.service.js")).default;
      convertMany = currencyService.convertMany.bind(currencyService);
    } catch {
      convertMany = null;
    }
  }

  const paidMonthItems = [];
  const pendingItems = [];
  const trendItemsByKey = {};

  for (const row of rows) {
    const status = normalizeStatus(row.status);
    const net = Number(row.net_amount ?? row.amount) || 0;
    const currency = String(row.currency || displayCurrency || "USD").toUpperCase();

    if (status === PAYOUT_STATUS.DRAFT) counts.draft += 1;
    else if (status === PAYOUT_STATUS.PENDING_APPROVAL)
      counts.pending_approval += 1;
    else if (
      status === PAYOUT_STATUS.READY_FOR_PAYOUT ||
      status === PAYOUT_STATUS.APPROVED
    ) {
      counts.ready += 1;
      pendingItems.push({ amount: net, currency });
    } else if (status === PAYOUT_STATUS.PAID) {
      counts.paid += 1;
      if (row.paid_at && moment(row.paid_at).isSameOrAfter(monthStart)) {
        paidMonthItems.push({ amount: net, currency });
      }
      const key = moment(row.paid_at || row.created_at).format("YYYY-MM");
      if (trend[key]) {
        if (!trendItemsByKey[key]) trendItemsByKey[key] = [];
        trendItemsByKey[key].push({ amount: net, currency });
      }
    } else if (status === PAYOUT_STATUS.CANCELLED) counts.cancelled += 1;
  }

  if (displayCurrency && convertMany) {
    const paid = await convertMany(paidMonthItems, displayCurrency);
    const pending = await convertMany(pendingItems, displayCurrency);
    paid_amount_month = paid.total;
    pending_amount = pending.total;
    for (const [key, items] of Object.entries(trendItemsByKey)) {
      const converted = await convertMany(items, displayCurrency);
      trend[key].value = converted.total;
    }
  } else {
    paid_amount_month = paidMonthItems.reduce((a, i) => a + i.amount, 0);
    pending_amount = pendingItems.reduce((a, i) => a + i.amount, 0);
    for (const [key, items] of Object.entries(trendItemsByKey)) {
      trend[key].value = items.reduce((a, i) => a + i.amount, 0);
    }
  }

  return {
    ...counts,
    paid_amount_month: Number(paid_amount_month.toFixed(2)),
    pending_amount: Number(pending_amount.toFixed(2)),
    display_currency: displayCurrency,
    status_distribution: [
      { code: "draft", name: "Draft", count: counts.draft },
      {
        code: "pending_approval",
        name: "Pending approval",
        count: counts.pending_approval,
      },
      { code: "ready", name: "Ready / Approved", count: counts.ready },
      { code: "paid", name: "Paid", count: counts.paid },
      { code: "cancelled", name: "Cancelled", count: counts.cancelled },
    ],
    monthly_payroll_trend: Object.values(trend),
  };
}

export default {
  PAYOUT_STATUS,
  listPayouts,
  getPayout,
  listEligibleTimesheets,
  createPayout,
  submitForApproval,
  approve,
  release,
  markPaid,
  cancel,
  updateAmounts,
  exportCsv,
  dashboardPayoutStats,
  normalizeStatus,
  AppError,
};
