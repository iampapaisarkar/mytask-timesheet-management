import { Op, fn, col, literal } from "sequelize";
import moment from "moment";
import models from "../../models/index.js";

const {
  AuditInternalApiLogs,
  AuditExternalApiLogs,
  AuditEmailLogs,
} = models;

function parsePaging(query = {}) {
  const rowsPerPage = Math.min(
    100,
    Math.max(1, Number(query.rows_per_page || query.per_page || 10)),
  );
  const pageNumber = Math.max(1, Number(query.page_number || query.page || 1));
  const offset = (pageNumber - 1) * rowsPerPage;
  return { rowsPerPage, pageNumber, offset };
}

function resolveDateRange(query = {}) {
  const preset = String(query.date_preset || query.range || "").toLowerCase();
  const now = moment().utc();
  let from = query.date_from ? moment.utc(query.date_from).startOf("day") : null;
  let to = query.date_to ? moment.utc(query.date_to).endOf("day") : null;

  if (!from && !to && preset) {
    switch (preset) {
      case "today":
        from = now.clone().startOf("day");
        to = now.clone().endOf("day");
        break;
      case "yesterday":
        from = now.clone().subtract(1, "day").startOf("day");
        to = now.clone().subtract(1, "day").endOf("day");
        break;
      case "this_week":
        from = now.clone().startOf("isoWeek");
        to = now.clone().endOf("isoWeek");
        break;
      case "this_month":
        from = now.clone().startOf("month");
        to = now.clone().endOf("month");
        break;
      case "last_month":
        from = now.clone().subtract(1, "month").startOf("month");
        to = now.clone().subtract(1, "month").endOf("month");
        break;
      default:
        break;
    }
  }

  if (!from && !to) {
    from = now.clone().subtract(7, "days").startOf("day");
    to = now.clone().endOf("day");
  }

  return {
    from: from ? from.toDate() : null,
    to: to ? to.toDate() : null,
  };
}

function successFilter(query) {
  if (query.success === "true" || query.success === true) return true;
  if (query.success === "false" || query.success === false) return false;
  if (query.status === "success") return true;
  if (query.status === "failed") return false;
  return undefined;
}

function applyOrgScope(where, organisation, roleCode, userId) {
  where.organisation_id = organisation.id;
  if (roleCode === "staff") {
    where.user_id = userId;
  }
  return where;
}

export async function listInternalLogs(user, organisation, query = {}) {
  const { rowsPerPage, pageNumber, offset } = parsePaging(query);
  const { from, to } = resolveDateRange(query);
  const where = applyOrgScope({}, organisation, organisation?.role?.code, user.id);
  if (from && to) where.started_at = { [Op.between]: [from, to] };
  const success = successFilter(query);
  if (success !== undefined) where.success = success;
  if (query.feature) where.feature = query.feature;
  if (query.method) where.method = String(query.method).toUpperCase();
  if (query.endpoint) where.endpoint = { [Op.like]: `%${query.endpoint}%` };
  if (query.role) where.role_code = query.role;
  if (query.user_id) where.user_id = Number(query.user_id);
  if (query.search) {
    where[Op.or] = [
      { endpoint: { [Op.like]: `%${query.search}%` } },
      { feature: { [Op.like]: `%${query.search}%` } },
      { friendly_message: { [Op.like]: `%${query.search}%` } },
      { correlation_id: { [Op.like]: `%${query.search}%` } },
    ];
  }

  const { rows, count } = await AuditInternalApiLogs.findAndCountAll({
    where,
    order: [["started_at", "DESC"]],
    limit: rowsPerPage,
    offset,
    raw: true,
  });

  return {
    data: rows,
    pagination: {
      total_rows: count,
      rows_per_page: rowsPerPage,
      page_number: pageNumber,
      total_pages: Math.max(1, Math.ceil(count / rowsPerPage)),
    },
  };
}

export async function listExternalLogs(user, organisation, query = {}) {
  const { rowsPerPage, pageNumber, offset } = parsePaging(query);
  const { from, to } = resolveDateRange(query);
  const where = applyOrgScope({}, organisation, organisation?.role?.code, user.id);
  if (from && to) where.executed_at = { [Op.between]: [from, to] };
  const success = successFilter(query);
  if (success !== undefined) where.success = success;
  if (query.feature) where.feature = query.feature;
  if (query.api_name) where.api_name = query.api_name;
  if (query.method) where.method = String(query.method).toUpperCase();
  if (query.endpoint) where.endpoint = { [Op.like]: `%${query.endpoint}%` };
  if (query.user_id) where.user_id = Number(query.user_id);
  if (query.search) {
    where[Op.or] = [
      { api_name: { [Op.like]: `%${query.search}%` } },
      { endpoint: { [Op.like]: `%${query.search}%` } },
      { feature: { [Op.like]: `%${query.search}%` } },
      { friendly_message: { [Op.like]: `%${query.search}%` } },
      { correlation_id: { [Op.like]: `%${query.search}%` } },
    ];
  }

  const { rows, count } = await AuditExternalApiLogs.findAndCountAll({
    where,
    order: [["executed_at", "DESC"]],
    limit: rowsPerPage,
    offset,
    raw: true,
  });

  return {
    data: rows,
    pagination: {
      total_rows: count,
      rows_per_page: rowsPerPage,
      page_number: pageNumber,
      total_pages: Math.max(1, Math.ceil(count / rowsPerPage)),
    },
  };
}

export async function listEmailLogs(user, organisation, query = {}) {
  const { rowsPerPage, pageNumber, offset } = parsePaging(query);
  const { from, to } = resolveDateRange(query);
  const where = applyOrgScope({}, organisation, organisation?.role?.code, user.id);
  if (from && to) where.sent_at = { [Op.between]: [from, to] };
  const success = successFilter(query);
  if (success !== undefined) where.success = success;
  if (query.template) where.template = query.template;
  if (query.provider) where.provider = query.provider;
  if (query.feature) where.feature = query.feature;
  if (query.user_id) where.user_id = Number(query.user_id);
  if (query.search) {
    where[Op.or] = [
      { recipient: { [Op.like]: `%${query.search}%` } },
      { subject: { [Op.like]: `%${query.search}%` } },
      { template: { [Op.like]: `%${query.search}%` } },
      { friendly_message: { [Op.like]: `%${query.search}%` } },
      { correlation_id: { [Op.like]: `%${query.search}%` } },
    ];
  }

  const { rows, count } = await AuditEmailLogs.findAndCountAll({
    where,
    order: [["sent_at", "DESC"]],
    limit: rowsPerPage,
    offset,
    raw: true,
  });

  return {
    data: rows,
    pagination: {
      total_rows: count,
      rows_per_page: rowsPerPage,
      page_number: pageNumber,
      total_pages: Math.max(1, Math.ceil(count / rowsPerPage)),
    },
  };
}

export async function getLogDetail(type, id, organisation, user) {
  const Model =
    type === "external"
      ? AuditExternalApiLogs
      : type === "email"
        ? AuditEmailLogs
        : AuditInternalApiLogs;
  const row = await Model.findOne({ where: { id }, raw: true });
  if (!row) return null;
  if (Number(row.organisation_id) !== Number(organisation.id)) return null;
  if (organisation?.role?.code === "staff" && Number(row.user_id) !== Number(user.id)) {
    return null;
  }
  return row;
}

export async function getAuditSummary(user, organisation, query = {}) {
  const { from, to } = resolveDateRange({
    ...query,
    date_preset: query.date_preset || "today",
  });
  const orgId = organisation.id;
  const staffScope =
    organisation?.role?.code === "staff" ? { user_id: user.id } : {};

  const [internalTotal, internalFail, externalTotal, externalFail, emailTotal, emailFail, authFails, slow] =
    await Promise.all([
      AuditInternalApiLogs.count({
        where: {
          organisation_id: orgId,
          started_at: { [Op.between]: [from, to] },
          ...staffScope,
        },
      }),
      AuditInternalApiLogs.count({
        where: {
          organisation_id: orgId,
          started_at: { [Op.between]: [from, to] },
          success: false,
          ...staffScope,
        },
      }),
      AuditExternalApiLogs.count({
        where: {
          organisation_id: orgId,
          executed_at: { [Op.between]: [from, to] },
          ...staffScope,
        },
      }),
      AuditExternalApiLogs.count({
        where: {
          organisation_id: orgId,
          executed_at: { [Op.between]: [from, to] },
          success: false,
          ...staffScope,
        },
      }),
      AuditEmailLogs.count({
        where: {
          organisation_id: orgId,
          sent_at: { [Op.between]: [from, to] },
          ...staffScope,
        },
      }),
      AuditEmailLogs.count({
        where: {
          organisation_id: orgId,
          sent_at: { [Op.between]: [from, to] },
          success: false,
          ...staffScope,
        },
      }),
      AuditInternalApiLogs.count({
        where: {
          organisation_id: orgId,
          started_at: { [Op.between]: [from, to] },
          error_category: "authentication",
          ...staffScope,
        },
      }),
      AuditInternalApiLogs.findAll({
        where: {
          organisation_id: orgId,
          started_at: { [Op.between]: [from, to] },
          duration_ms: { [Op.ne]: null },
          ...staffScope,
        },
        attributes: ["endpoint", "method", "duration_ms", "feature", "started_at"],
        order: [["duration_ms", "DESC"]],
        limit: 5,
        raw: true,
      }),
    ]);

  const recentCritical = await AuditInternalApiLogs.findAll({
    where: {
      organisation_id: orgId,
      started_at: { [Op.between]: [from, to] },
      success: false,
      status_code: { [Op.gte]: 500 },
      ...staffScope,
    },
    order: [["started_at", "DESC"]],
    limit: 8,
    raw: true,
  });

  const topErrors = await AuditInternalApiLogs.findAll({
    where: {
      organisation_id: orgId,
      started_at: { [Op.between]: [from, to] },
      success: false,
      ...staffScope,
    },
    attributes: [
      "error_category",
      [fn("COUNT", col("id")), "count"],
    ],
    group: ["error_category"],
    order: [[literal("count"), "DESC"]],
    limit: 8,
    raw: true,
  }).catch(() => []);

  const pct = (ok, total) =>
    total > 0 ? Math.round(((total - ok) / total) * 1000) / 10 : 100;

  return {
    data: {
      range: { from, to },
      internal: {
        total: internalTotal,
        failed: internalFail,
        success_pct: pct(internalFail, internalTotal),
      },
      external: {
        total: externalTotal,
        failed: externalFail,
        success_pct: pct(externalFail, externalTotal),
      },
      email: {
        total: emailTotal,
        failed: emailFail,
        success_pct: pct(emailFail, emailTotal),
      },
      authentication_failures: authFails,
      todays_errors: internalFail + externalFail + emailFail,
      slowest_apis: slow,
      top_error_types: topErrors,
      recent_critical: recentCritical,
    },
  };
}

export async function purgeOlderThan(days) {
  const cutoff = moment().utc().subtract(days, "days").toDate();
  const [i, e, m] = await Promise.all([
    AuditInternalApiLogs.destroy({ where: { created_at: { [Op.lt]: cutoff } } }),
    AuditExternalApiLogs.destroy({ where: { created_at: { [Op.lt]: cutoff } } }),
    AuditEmailLogs.destroy({ where: { created_at: { [Op.lt]: cutoff } } }),
  ]);
  return { internal: i, external: e, email: m, cutoff };
}

export default {
  listInternalLogs,
  listExternalLogs,
  listEmailLogs,
  getLogDetail,
  getAuditSummary,
  purgeOlderThan,
};
