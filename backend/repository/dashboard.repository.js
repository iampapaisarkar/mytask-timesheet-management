/**
 * Dashboard data access — Sequelize only. No business rules.
 */
import { Op } from "sequelize";
import moment from "moment";
import models from "../models/index.js";

const {
  Employees,
  Timesheets,
  TimesheetStatus,
  TimesheetDays,
  Payouts,
  EmployeeWages,
} = models;

export async function findManagementStaffIds(organisation) {
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
  return employees.map((e) => e.id);
}

export async function findDashboardTimesheets(whereCondition, { limit = 500 } = {}) {
  if (!whereCondition) return [];
  return Timesheets.unscoped().findAll({
    where: whereCondition,
    attributes: [
      "id",
      "code",
      "period_start_date",
      "period_end_date",
      "created_at",
      "employee_id",
    ],
    include: [
      {
        model: TimesheetStatus,
        as: "status",
        attributes: ["id", "name", "code"],
      },
    ],
    order: [["created_at", "desc"]],
    limit,
    raw: false,
    nest: true,
  });
}

export async function findDashboardDayRows(timesheetIds, { from, to } = {}) {
  if (!timesheetIds?.length) return [];
  const trendStart =
    from || moment().subtract(5, "months").startOf("month").format("YYYY-MM-DD");
  const weekEnd = to || moment().endOf("isoWeek").format("YYYY-MM-DD");
  return TimesheetDays.findAll({
    where: {
      timesheet_id: { [Op.in]: timesheetIds },
      date: { [Op.between]: [trendStart, weekEnd] },
    },
    attributes: [
      "date",
      "timesheet_id",
      "total_working_hours_in_decimal",
      "is_public_holiday",
    ],
    raw: true,
  });
}

export async function countScopedEmployees(organisation, employeeScopeIds) {
  return Employees.unscoped().count({
    where: {
      organisation_id: organisation.id,
      ...(employeeScopeIds ? { id: { [Op.in]: employeeScopeIds } } : {}),
    },
  });
}

export async function findStaffWageCurrency(organisation) {
  if (!organisation?.employee?.id) return null;
  const wage = await EmployeeWages.findOne({
    where: {
      organisation_id: organisation.id,
      employee_id: organisation.employee.id,
    },
    attributes: ["currency"],
    order: [["id", "DESC"]],
    raw: true,
  }).catch(() => null);
  return wage?.currency ? String(wage.currency).toUpperCase() : null;
}

export async function findLatestStaffPayout(organisation) {
  if (!organisation?.employee?.id) return null;
  return Payouts.findOne({
    where: {
      organisation_id: organisation.id,
      employee_id: organisation.employee.id,
      status: { [Op.ne]: "CANCELLED" },
    },
    order: [["id", "DESC"]],
    attributes: [
      "id",
      "payout_number",
      "status",
      "amount",
      "net_amount",
      "currency",
      "paid_at",
      "pay_date",
      "period_start_date",
      "period_end_date",
    ],
    raw: true,
  });
}

export default {
  findManagementStaffIds,
  findDashboardTimesheets,
  findDashboardDayRows,
  countScopedEmployees,
  findStaffWageCurrency,
  findLatestStaffPayout,
};
