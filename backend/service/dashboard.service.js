/**
 * Dashboard domain service — one responsibility per public method.
 * Controllers stay thin; repository owns Sequelize access.
 *
 * Split endpoints (enterprise parallel load):
 *   GET /screens/dashboard/summary
 *   GET /screens/dashboard/graphs
 *   GET /screens/dashboard/recent
 *   GET /screens/dashboard/pending
 *
 * Aggregate GET /screens/dashboard remains for backward compatibility
 * and composes the four slices via Promise.all + shared context cache.
 */
import moment from "moment";
import { Op, col } from "sequelize";
import payoutService from "./payout.service.js";
import currencyService from "./currency.service.js";
import redisUtils from "../utils/redis.utils.js";
import { resolveOrganisationDisplayCurrency } from "../utils/currency.utils.js";
import dashboardRepository from "../repository/dashboard.repository.js";
import models from "../models/index.js";

const { Notifications, NotificationStatus } = models;

const CONTEXT_TTL_SECONDS = 20;

async function buildTimesheetWhere(organisation) {
  const canManage = organisation.acl?.timesheetManagement?.list;
  const canSelf = organisation.acl?.timesheet?.list;

  if (canManage) {
    let whereCondition = { organisation_id: organisation.id };
    if (organisation.role?.code !== "owner") {
      whereCondition.employee_id = {
        [Op.ne]: organisation?.employee?.id,
      };
    }
    if (organisation.role?.code === "manager") {
      const staffIds =
        await dashboardRepository.findManagementStaffIds(organisation);
      whereCondition.employee_id = { [Op.in]: staffIds || [] };
    }
    return { whereCondition, source: "management" };
  }

  if (canSelf && organisation?.employee?.id) {
    return {
      whereCondition: {
        organisation_id: organisation.id,
        employee_id: organisation.employee.id,
      },
      source: "self",
    };
  }

  return { whereCondition: null, source: "none" };
}

function emptyKpis() {
  return {
    approved: 0,
    draft: 0,
    submitted: 0,
    rejected: 0,
    total: 0,
    approval_rate_pct: 0,
    employees: 0,
    worked_hours_month: 0,
    approved_hours_month: 0,
    pending_hours_month: 0,
    payroll_this_month: 0,
    pending_payout_amount: 0,
    pending_payouts: 0,
    paid_payouts: 0,
  };
}

function emptyWeekly() {
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => ({
    day,
    completed: 0,
    pending: 0,
  }));
}

function plainRow(row) {
  return row?.toJSON ? row.toJSON() : row;
}

/**
 * Shared expensive load — Redis-cached ~20s so parallel slice requests
 * from the same client do not re-scan timesheets four times.
 */
async function loadDashboardContext(user, organisation) {
  const cacheKey = `dashboard:ctx:${organisation.id}:${user.id}:${organisation.role?.code || "none"}`;
  const cached = await redisUtils.getCache(cacheKey).catch(() => null);
  if (cached) return cached;

  const { whereCondition, source } = await buildTimesheetWhere(organisation);
  const role = organisation?.role?.code || null;

  let displayCurrency = resolveOrganisationDisplayCurrency(organisation);
  if (role === "staff" && organisation?.employee?.id) {
    const wageCurrency =
      await dashboardRepository.findStaffWageCurrency(organisation);
    if (wageCurrency) displayCurrency = wageCurrency;
  }

  let employeeScopeIds = null;
  if (role === "staff" && organisation?.employee?.id) {
    employeeScopeIds = [Number(organisation.employee.id)];
  } else if (role === "manager") {
    employeeScopeIds =
      await dashboardRepository.findManagementStaffIds(organisation);
  }

  if (!whereCondition) {
    const ctx = {
      source,
      role,
      displayCurrency,
      employeeScopeIds,
      timesheets: [],
      dayRows: [],
      statusCounts: {},
      approved: 0,
      draft: 0,
      submitted: 0,
      rejected: 0,
      total: 0,
      approval_rate_pct: 0,
      approvedIds: [],
      pendingIds: [],
      pendingSubmittedId: null,
    };
    await redisUtils
      .setCacheEx(cacheKey, ctx, CONTEXT_TTL_SECONDS)
      .catch(() => {});
    return ctx;
  }

  const timesheets =
    await dashboardRepository.findDashboardTimesheets(whereCondition);

  const statusCounts = new Map();
  for (const row of timesheets) {
    const plain = plainRow(row);
    const code = plain.status?.code || "unknown";
    const name = plain.status?.name || code;
    const prev = statusCounts.get(code) || { code, name, count: 0 };
    prev.count += 1;
    statusCounts.set(code, prev);
  }

  const approved = statusCounts.get("approved")?.count || 0;
  const draft = statusCounts.get("draft")?.count || 0;
  const submitted = statusCounts.get("submitted")?.count || 0;
  const rejected = statusCounts.get("rejected")?.count || 0;
  const total = timesheets.length;
  const decided = approved + rejected;
  const approval_rate_pct =
    decided > 0 ? Math.round((approved / decided) * 100) : 0;

  const timesheetIds = timesheets.map((t) => t.id);
  const approvedIds = timesheets
    .filter((t) => plainRow(t).status?.code === "approved")
    .map((t) => t.id);
  const pendingIds = timesheets
    .filter((t) => {
      const code = plainRow(t).status?.code;
      return code === "draft" || code === "submitted";
    })
    .map((t) => t.id);

  const pendingSubmitted = timesheets.find(
    (t) => plainRow(t).status?.code === "submitted",
  );

  const dayRows =
    await dashboardRepository.findDashboardDayRows(timesheetIds);

  const ctx = {
    source,
    role,
    displayCurrency,
    employeeScopeIds,
    timesheets: timesheets.map((t) => plainRow(t)),
    dayRows,
    statusCounts: Object.fromEntries(statusCounts),
    approved,
    draft,
    submitted,
    rejected,
    total,
    approval_rate_pct,
    approvedIds,
    pendingIds,
    pendingSubmittedId: pendingSubmitted?.id ?? null,
  };

  await redisUtils
    .setCacheEx(cacheKey, ctx, CONTEXT_TTL_SECONDS)
    .catch(() => {});
  return ctx;
}

async function loadPayoutStats(organisation, ctx) {
  if (!organisation.acl?.payout?.list) {
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
  return payoutService.dashboardPayoutStats(
    organisation,
    ctx.employeeScopeIds,
    { displayCurrency: ctx.displayCurrency },
  );
}

function computeHours(ctx) {
  const monthStart = moment().startOf("month");
  const monthEnd = moment().endOf("month");
  const approvedSet = new Set(ctx.approvedIds);
  const pendingSet = new Set(ctx.pendingIds);
  let worked_hours_month = 0;
  let approved_hours_month = 0;
  let pending_hours_month = 0;
  for (const day of ctx.dayRows) {
    const m = moment(day.date);
    if (!m.isBetween(monthStart, monthEnd, "day", "[]")) continue;
    const hours = Number(day.total_working_hours_in_decimal) || 0;
    worked_hours_month += hours;
    if (approvedSet.has(day.timesheet_id)) approved_hours_month += hours;
    if (pendingSet.has(day.timesheet_id)) pending_hours_month += hours;
  }
  return {
    worked_hours_month: Number(worked_hours_month.toFixed(2)),
    approved_hours_month: Number(approved_hours_month.toFixed(2)),
    pending_hours_month: Number(pending_hours_month.toFixed(2)),
  };
}

function computeWeeklyProgress(ctx) {
  const weekStart = moment().startOf("isoWeek");
  const weekEnd = moment().endOf("isoWeek");
  const weeklyMap = {
    Mon: { completed: 0, pending: 0 },
    Tue: { completed: 0, pending: 0 },
    Wed: { completed: 0, pending: 0 },
    Thu: { completed: 0, pending: 0 },
    Fri: { completed: 0, pending: 0 },
    Sat: { completed: 0, pending: 0 },
    Sun: { completed: 0, pending: 0 },
  };
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (const day of ctx.dayRows) {
    const m = moment(day.date);
    if (!m.isBetween(weekStart, weekEnd, "day", "[]")) continue;
    const label = dayNames[m.day()];
    const hours = Number(day.total_working_hours_in_decimal) || 0;
    if (hours > 0) weeklyMap[label].completed += 1;
    else weeklyMap[label].pending += 1;
  }
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => ({
    day,
    completed: weeklyMap[day].completed,
    pending: weeklyMap[day].pending,
  }));
}

function computeMonthlyProgress(ctx) {
  const monthStart = moment().startOf("month");
  const monthEnd = moment().endOf("month");
  const weeksInMonth = {};
  for (const day of ctx.dayRows) {
    const m = moment(day.date);
    if (!m.isBetween(monthStart, monthEnd, "day", "[]")) continue;
    const weekNum = Math.ceil(m.date() / 7);
    const key = `W${weekNum}`;
    if (!weeksInMonth[key]) weeksInMonth[key] = { done: 0, total: 0 };
    weeksInMonth[key].total += 1;
    if ((Number(day.total_working_hours_in_decimal) || 0) > 0) {
      weeksInMonth[key].done += 1;
    }
  }
  return Object.keys(weeksInMonth)
    .sort()
    .map((week) => ({
      week,
      progress_pct:
        weeksInMonth[week].total > 0
          ? Math.round(
              (weeksInMonth[week].done / weeksInMonth[week].total) * 100,
            )
          : 0,
    }));
}

function computeProductivityTrend(ctx) {
  const trendBuckets = {};
  for (let i = 5; i >= 0; i -= 1) {
    const m = moment().subtract(i, "months");
    trendBuckets[m.format("YYYY-MM")] = {
      label: m.format("MMM"),
      value: 0,
    };
  }
  for (const plain of ctx.timesheets) {
    if (plain.status?.code !== "approved") continue;
    const key = moment(plain.period_end_date || plain.created_at).format(
      "YYYY-MM",
    );
    if (trendBuckets[key]) trendBuckets[key].value += 1;
  }
  return Object.values(trendBuckets);
}

async function listRecentNotifications(userId, limit = 8) {
  try {
    const rows = await Notifications.findAll({
      attributes: ["id", "title", "body", "url", "sent_at"],
      where: { user_id: userId },
      include: [
        {
          model: NotificationStatus,
          as: "status",
          attributes: ["id", "name", "code"],
          on: { id: { [Op.eq]: col("Notifications.status_id") } },
          required: true,
        },
      ],
      limit,
      order: [["sent_at", "desc"]],
      raw: false,
      nest: true,
      subQuery: false,
    });
    return rows.map((n) => {
      const plain = plainRow(n);
      return {
        title: plain.title || "Notification",
        meta: plain.body || plain.sent_at || "",
        at: plain.sent_at,
        url: plain.url || null,
      };
    });
  } catch {
    return [];
  }
}

/** KPI strip — single responsibility. */
export async function getDashboardSummary(user, organisation) {
  const ctx = await loadDashboardContext(user, organisation);
  const [payoutStats, hours, employeeCount] = await Promise.all([
    loadPayoutStats(organisation, ctx),
    Promise.resolve(computeHours(ctx)),
    ctx.source === "management"
      ? dashboardRepository.countScopedEmployees(
          organisation,
          ctx.employeeScopeIds,
        )
      : Promise.resolve(organisation?.employee?.id ? 1 : 0),
  ]);

  return {
    success: true,
    data: {
      source: ctx.source,
      role: ctx.role,
      display_currency: ctx.displayCurrency,
      kpis: {
        ...emptyKpis(),
        approved: ctx.approved,
        draft: ctx.draft,
        submitted: ctx.submitted,
        rejected: ctx.rejected,
        total: ctx.total,
        approval_rate_pct: ctx.approval_rate_pct,
        employees: employeeCount,
        ...hours,
        payroll_this_month: payoutStats.paid_amount_month || 0,
        pending_payout_amount: payoutStats.pending_amount || 0,
        pending_payouts:
          (payoutStats.ready || 0) + (payoutStats.pending_approval || 0),
        paid_payouts: payoutStats.paid || 0,
      },
    },
  };
}

/** Charts / trends — single responsibility. */
export async function getDashboardGraphs(user, organisation) {
  const ctx = await loadDashboardContext(user, organisation);
  const payoutStats = await loadPayoutStats(organisation, ctx);

  return {
    success: true,
    data: {
      source: ctx.source,
      role: ctx.role,
      display_currency: ctx.displayCurrency,
      status_donut: Object.values(ctx.statusCounts),
      weekly_progress: ctx.timesheets.length
        ? computeWeeklyProgress(ctx)
        : emptyWeekly(),
      monthly_progress: computeMonthlyProgress(ctx),
      productivity_trend: computeProductivityTrend(ctx),
      payroll_trend: payoutStats.monthly_payroll_trend || [],
      payout_status_donut: payoutStats.status_distribution || [],
    },
  };
}

/** Recent activity feed — single responsibility. */
export async function getDashboardRecent(user, organisation) {
  const ctx = await loadDashboardContext(user, organisation);

  const recent_activity = await listRecentNotifications(user.id, 8);
  const team_activity = [
    { name: "Timesheets", count: ctx.total },
    { name: "Approvals", count: ctx.approved },
    { name: "Submitted", count: ctx.submitted },
    { name: "Draft", count: ctx.draft },
  ];

  let latest_payout = null;
  if (
    organisation.acl?.payout?.list &&
    organisation.role?.code === "staff" &&
    organisation?.employee?.id
  ) {
    latest_payout =
      (await dashboardRepository.findLatestStaffPayout(organisation)) || null;
    if (
      latest_payout?.currency &&
      String(latest_payout.currency).toUpperCase() !== ctx.displayCurrency
    ) {
      try {
        const converted = await currencyService.convertAmount(
          latest_payout.net_amount ?? latest_payout.amount,
          latest_payout.currency,
          ctx.displayCurrency,
        );
        latest_payout = {
          ...latest_payout,
          amount_original: latest_payout.net_amount ?? latest_payout.amount,
          currency_original: latest_payout.currency,
          net_amount: converted.amount,
          amount: converted.amount,
          currency: ctx.displayCurrency,
        };
      } catch {
        /* keep native */
      }
    }
  }

  return {
    success: true,
    data: {
      source: ctx.source,
      role: ctx.role,
      recent_activity,
      team_activity,
      latest_payout,
    },
  };
}

/** Pending approvals / quick actions — single responsibility. */
export async function getDashboardPending(user, organisation) {
  const ctx = await loadDashboardContext(user, organisation);
  return {
    success: true,
    data: {
      source: ctx.source,
      role: ctx.role,
      submitted: ctx.submitted,
      draft: ctx.draft,
      pending_hours_month: computeHours(ctx).pending_hours_month,
      quick_links_hint: {
        has_pending_approvals: ctx.submitted > 0,
        open_timesheet_id: ctx.pendingSubmittedId,
      },
    },
  };
}

/**
 * Backward-compatible aggregate. Loads all slices in parallel;
 * shared Redis context means the heavy scan runs once.
 */
export async function getDashboardOverview(user, organisation) {
  const [summary, graphs, recent, pending] = await Promise.all([
    getDashboardSummary(user, organisation),
    getDashboardGraphs(user, organisation),
    getDashboardRecent(user, organisation),
    getDashboardPending(user, organisation),
  ]);

  if (!summary.success) return summary;

  return {
    success: true,
    data: {
      source: summary.data.source,
      role: summary.data.role,
      display_currency: summary.data.display_currency,
      kpis: summary.data.kpis,
      status_donut: graphs.data.status_donut,
      weekly_progress: graphs.data.weekly_progress,
      monthly_progress: graphs.data.monthly_progress,
      productivity_trend: graphs.data.productivity_trend,
      payroll_trend: graphs.data.payroll_trend,
      payout_status_donut: graphs.data.payout_status_donut,
      team_activity: recent.data.team_activity,
      recent_activity: recent.data.recent_activity,
      latest_payout: recent.data.latest_payout,
      quick_links_hint: pending.data.quick_links_hint,
    },
  };
}

export default {
  getDashboardSummary,
  getDashboardGraphs,
  getDashboardRecent,
  getDashboardPending,
  getDashboardOverview,
};
