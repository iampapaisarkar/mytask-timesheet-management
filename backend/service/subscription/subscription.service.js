import moment from "moment";
import { Op } from "sequelize";
import models from "../../models/index.js";
import {
  ACTIVE_SUBSCRIPTION_STATUSES,
  FEATURE_KEYS,
  PLAN_CODES,
} from "../../config/subscription.config.js";

const {
  Plans,
  PlanPrices,
  PlanFeatures,
  Subscriptions,
  SubscriptionHistory,
  SystemLogsAccess,
  UserOrganisationRoles,
  OrganisationRoles,
  Employees,
  Customers,
  Jobs,
  UsageCounters,
} = models;

function nowUtc() {
  return moment().utc().format();
}

function periodKeys() {
  const m = moment().utc();
  return {
    daily: m.format("YYYY-MM-DD"),
    monthly: m.format("YYYY-MM"),
    lifetime: "lifetime",
  };
}

export async function getPlanByCode(code, { transaction } = {}) {
  return Plans.findOne({
    where: { code, is_active: true, deleted_at: null },
    include: [
      {
        model: PlanPrices,
        as: "prices",
        where: { is_active: true, deleted_at: null },
        required: false,
      },
      { model: PlanFeatures, as: "features", required: false },
    ],
    transaction,
  });
}

export async function listActivePlans() {
  const plans = await Plans.findAll({
    where: { is_active: true, deleted_at: null },
    include: [
      {
        model: PlanPrices,
        as: "prices",
        where: { is_active: true, deleted_at: null },
        required: false,
      },
      { model: PlanFeatures, as: "features", required: false },
    ],
    order: [["sort_order", "ASC"]],
  });
  return plans.map(serializePlan);
}

export function serializePlan(plan) {
  const plain = plan.get ? plan.get({ plain: true }) : plan;
  const features = {};
  for (const f of plain.features || []) {
    features[f.feature_key] =
      f.feature_type === "boolean" ? Boolean(f.bool_value) : f.limit_value;
  }
  return {
    id: plain.id,
    code: plain.code,
    name: plain.name,
    description: plain.description,
    is_free: Boolean(plain.is_free),
    features,
    prices: (plain.prices || []).map((p) => ({
      id: p.id,
      billing_interval: p.billing_interval,
      amount_cents: p.amount_cents,
      currency: p.currency,
      stripe_price_id: p.stripe_price_id,
    })),
  };
}

export async function getActiveSubscription(userId, { transaction } = {}) {
  return Subscriptions.findOne({
    where: {
      user_id: userId,
      deleted_at: null,
      status: { [Op.in]: ACTIVE_SUBSCRIPTION_STATUSES },
    },
    include: [
      {
        model: Plans,
        as: "plan",
        include: [{ model: PlanFeatures, as: "features", required: false }],
      },
      { model: PlanPrices, as: "plan_price", required: false },
    ],
    order: [["id", "DESC"]],
    transaction,
  });
}

export async function ensureFreeSubscription(userId, { transaction } = {}) {
  const existing = await getActiveSubscription(userId, { transaction });
  if (existing) return existing;

  const freePlan = await getPlanByCode(PLAN_CODES.FREE, { transaction });
  if (!freePlan) {
    const err = new Error("Free plan is not configured");
    err.statusCode = 500;
    throw err;
  }

  const freePrice =
    (freePlan.prices || []).find((p) => p.billing_interval === "none") || null;

  const sub = await Subscriptions.create(
    {
      user_id: userId,
      plan_id: freePlan.id,
      plan_price_id: freePrice?.id || null,
      status: "active",
      billing_interval: "none",
      payment_status: "none",
      current_period_start: nowUtc(),
      created_at: nowUtc(),
      updated_at: nowUtc(),
    },
    { transaction },
  );

  await SubscriptionHistory.create(
    {
      subscription_id: sub.id,
      user_id: userId,
      from_plan_id: null,
      to_plan_id: freePlan.id,
      event_type: "assigned_free",
      previous_status: null,
      new_status: "active",
      notes: "Automatically assigned Free plan on signup",
      created_at: nowUtc(),
    },
    { transaction },
  );

  await SystemLogsAccess.upsert(
    {
      user_id: userId,
      enabled: false,
      plan_code: PLAN_CODES.FREE,
      revoked_at: nowUtc(),
      created_at: nowUtc(),
      updated_at: nowUtc(),
    },
    { transaction },
  );

  return getActiveSubscription(userId, { transaction });
}

export function featuresMapFromPlan(plan) {
  const map = {};
  const features = plan?.features || [];
  for (const f of features) {
    const row = f.get ? f.get({ plain: true }) : f;
    map[row.feature_key] =
      row.feature_type === "boolean"
        ? Boolean(row.bool_value)
        : Number(row.limit_value);
  }
  return map;
}

export async function getUserPlanContext(userId, { transaction } = {}) {
  let subscription = await getActiveSubscription(userId, { transaction });
  if (!subscription) {
    subscription = await ensureFreeSubscription(userId, { transaction });
  }
  const plan = subscription.plan;
  const features = featuresMapFromPlan(plan);
  return {
    subscription,
    plan,
    planCode: plan?.code || PLAN_CODES.FREE,
    features,
    isPro:
      plan?.code === PLAN_CODES.PRO &&
      ACTIVE_SUBSCRIPTION_STATUSES.includes(subscription.status),
  };
}

/**
 * Workspace limits use the organisation owner's subscription.
 * Org creation limits use the acting user.
 */
export async function resolveOrgOwnerUserId(organisationId, { transaction } = {}) {
  const ownerRole = await OrganisationRoles.findOne({
    where: { code: "owner" },
    attributes: ["id"],
    transaction,
  });
  if (!ownerRole) return null;
  const membership = await UserOrganisationRoles.findOne({
    where: {
      organisation_id: organisationId,
      role_id: ownerRole.id,
    },
    attributes: ["user_id"],
    transaction,
  });
  return membership?.user_id || null;
}

export async function getFeatureLimit(userId, featureKey, { transaction } = {}) {
  const ctx = await getUserPlanContext(userId, { transaction });
  return ctx.features[featureKey];
}

export async function assertBooleanFeature(userId, featureKey, { transaction } = {}) {
  const enabled = await getFeatureLimit(userId, featureKey, { transaction });
  if (!enabled) {
    const err = new Error(
      `Your current plan does not include ${featureKey.replace(/_/g, " ")}. Upgrade to Pro to unlock this feature.`,
    );
    err.statusCode = 403;
    err.code = "PLAN_FEATURE_DISABLED";
    err.feature = featureKey;
    throw err;
  }
}

export async function countOwnedOrganisations(userId, { transaction } = {}) {
  const ownerRole = await OrganisationRoles.findOne({
    where: { code: "owner" },
    attributes: ["id"],
    transaction,
  });
  if (!ownerRole) return 0;
  return UserOrganisationRoles.count({
    where: { user_id: userId, role_id: ownerRole.id },
    transaction,
  });
}

export async function getUsageCount({
  userId,
  featureKey,
  periodType,
  organisationId = null,
  employeeId = null,
  transaction,
}) {
  const keys = periodKeys();
  const periodKey =
    periodType === "daily"
      ? keys.daily
      : periodType === "monthly"
        ? keys.monthly
        : keys.lifetime;

  const orgId = organisationId == null ? 0 : organisationId;
  const empId = employeeId == null ? 0 : employeeId;

  const row = await UsageCounters.findOne({
    where: {
      user_id: userId,
      feature_key: featureKey,
      period_type: periodType,
      period_key: periodKey,
      organisation_id: orgId,
      employee_id: empId,
    },
    transaction,
  });
  return row?.count || 0;
}

export async function incrementUsage({
  userId,
  featureKey,
  periodType,
  organisationId = null,
  employeeId = null,
  amount = 1,
  transaction,
}) {
  const keys = periodKeys();
  const periodKey =
    periodType === "daily"
      ? keys.daily
      : periodType === "monthly"
        ? keys.monthly
        : keys.lifetime;

  const orgId = organisationId == null ? 0 : organisationId;
  const empId = employeeId == null ? 0 : employeeId;

  const [row] = await UsageCounters.findOrCreate({
    where: {
      user_id: userId,
      feature_key: featureKey,
      period_type: periodType,
      period_key: periodKey,
      organisation_id: orgId,
      employee_id: empId,
    },
    defaults: {
      count: 0,
      created_at: nowUtc(),
      updated_at: nowUtc(),
    },
    transaction,
  });

  await row.update(
    { count: Number(row.count) + amount, updated_at: nowUtc() },
    { transaction },
  );
  return Number(row.count);
}

export async function assertWithinLimit({
  userId,
  featureKey,
  currentCount,
  label,
  transaction,
}) {
  const limit = await getFeatureLimit(userId, featureKey, { transaction });
  if (typeof limit !== "number") return { limit, remaining: null };
  if (currentCount >= limit) {
    const err = new Error(
      `${label || featureKey} limit reached (${limit}). Upgrade to Pro for higher limits.`,
    );
    err.statusCode = 403;
    err.code = "PLAN_LIMIT_REACHED";
    err.feature = featureKey;
    err.limit = limit;
    err.current = currentCount;
    throw err;
  }
  return { limit, remaining: Math.max(0, limit - currentCount) };
}

export async function checkCreateOrganisation(userId, { transaction } = {}) {
  const count = await countOwnedOrganisations(userId, { transaction });
  return assertWithinLimit({
    userId,
    featureKey: FEATURE_KEYS.ORGANISATIONS,
    currentCount: count,
    label: "Organisation",
    transaction,
  });
}

export async function checkCreateEmployee(ownerUserId, organisationId, { transaction } = {}) {
  const count = await Employees.count({
    where: { organisation_id: organisationId },
    transaction,
  });
  return assertWithinLimit({
    userId: ownerUserId,
    featureKey: FEATURE_KEYS.EMPLOYEES_PER_ORG,
    currentCount: count,
    label: "Employee",
    transaction,
  });
}

export async function checkCreateCustomer(ownerUserId, organisationId, { transaction } = {}) {
  const count = await Customers.count({
    where: { organisation_id: organisationId },
    transaction,
  });
  return assertWithinLimit({
    userId: ownerUserId,
    featureKey: FEATURE_KEYS.CUSTOMERS,
    currentCount: count,
    label: "Customer",
    transaction,
  });
}

export async function checkCreateJob(ownerUserId, customerId, { transaction } = {}) {
  const count = await Jobs.count({
    where: { customer_id: customerId },
    transaction,
  });
  return assertWithinLimit({
    userId: ownerUserId,
    featureKey: FEATURE_KEYS.JOBS_PER_CUSTOMER,
    currentCount: count,
    label: "Job",
    transaction,
  });
}

export async function checkGenerateTimesheet(
  ownerUserId,
  organisationId,
  employeeId,
  { transaction } = {},
) {
  const used = await getUsageCount({
    userId: ownerUserId,
    featureKey: FEATURE_KEYS.TIMESHEETS_PER_EMPLOYEE_MONTH,
    periodType: "monthly",
    organisationId,
    employeeId,
    transaction,
  });
  await assertWithinLimit({
    userId: ownerUserId,
    featureKey: FEATURE_KEYS.TIMESHEETS_PER_EMPLOYEE_MONTH,
    currentCount: used,
    label: "Timesheet generation",
    transaction,
  });
}

export async function recordTimesheetGenerated(
  ownerUserId,
  organisationId,
  employeeId,
  { transaction } = {},
) {
  return incrementUsage({
    userId: ownerUserId,
    featureKey: FEATURE_KEYS.TIMESHEETS_PER_EMPLOYEE_MONTH,
    periodType: "monthly",
    organisationId,
    employeeId,
    transaction,
  });
}

export async function checkGenerateReport(ownerUserId, organisationId, { transaction } = {}) {
  const used = await getUsageCount({
    userId: ownerUserId,
    featureKey: FEATURE_KEYS.REPORTS_PER_DAY,
    periodType: "daily",
    organisationId,
    transaction,
  });
  await assertWithinLimit({
    userId: ownerUserId,
    featureKey: FEATURE_KEYS.REPORTS_PER_DAY,
    currentCount: used,
    label: "Report generation",
    transaction,
  });
}

export async function recordReportGenerated(
  ownerUserId,
  organisationId,
  { transaction } = {},
) {
  return incrementUsage({
    userId: ownerUserId,
    featureKey: FEATURE_KEYS.REPORTS_PER_DAY,
    periodType: "daily",
    organisationId,
    transaction,
  });
}

export async function canSendEmailNotifications(userId, { transaction } = {}) {
  const val = await getFeatureLimit(
    userId,
    FEATURE_KEYS.EMAIL_NOTIFICATIONS,
    { transaction },
  );
  return Boolean(val);
}

export async function canAccessSystemLogs(userId, { transaction } = {}) {
  const val = await getFeatureLimit(userId, FEATURE_KEYS.SYSTEM_LOGS, {
    transaction,
  });
  return Boolean(val);
}

export async function buildUsageSnapshot(userId) {
  const ctx = await getUserPlanContext(userId);
  const ownedOrgs = await countOwnedOrganisations(userId);
  const orgLimit = ctx.features[FEATURE_KEYS.ORGANISATIONS];
  const reportUsed = await getUsageCount({
    userId,
    featureKey: FEATURE_KEYS.REPORTS_PER_DAY,
    periodType: "daily",
  });

  return {
    plan_code: ctx.planCode,
    features: ctx.features,
    usage: {
      organisations: {
        used: ownedOrgs,
        limit: orgLimit,
        remaining:
          typeof orgLimit === "number"
            ? Math.max(0, orgLimit - ownedOrgs)
            : null,
      },
      reports_today: {
        used: reportUsed,
        limit: ctx.features[FEATURE_KEYS.REPORTS_PER_DAY],
        remaining: Math.max(
          0,
          (ctx.features[FEATURE_KEYS.REPORTS_PER_DAY] || 0) - reportUsed,
        ),
      },
    },
  };
}

export async function serializeSubscriptionForApi(userId) {
  const ctx = await getUserPlanContext(userId);
  const sub = ctx.subscription;
  const plan = serializePlan(ctx.plan);
  const usage = await buildUsageSnapshot(userId);

  return {
    id: sub.id,
    status: sub.status,
    billing_interval: sub.billing_interval,
    payment_status: sub.payment_status,
    cancel_at_period_end: Boolean(sub.cancel_at_period_end),
    current_period_start: sub.current_period_start,
    current_period_end: sub.current_period_end,
    canceled_at: sub.canceled_at,
    ended_at: sub.ended_at,
    stripe_subscription_id: sub.stripe_subscription_id,
    is_pro: ctx.isPro,
    plan,
    usage,
  };
}

export async function recordSubscriptionHistory({
  subscriptionId,
  userId,
  fromPlanId,
  toPlanId,
  eventType,
  previousStatus,
  newStatus,
  notes,
  metadata,
  transaction,
}) {
  return SubscriptionHistory.create(
    {
      subscription_id: subscriptionId,
      user_id: userId,
      from_plan_id: fromPlanId || null,
      to_plan_id: toPlanId || null,
      event_type: eventType,
      previous_status: previousStatus || null,
      new_status: newStatus || null,
      notes: notes || null,
      metadata: metadata || null,
      created_at: nowUtc(),
    },
    { transaction },
  );
}

export async function syncSystemLogsAccess(userId, planCode, enabled, { transaction } = {}) {
  await SystemLogsAccess.upsert(
    {
      user_id: userId,
      enabled: Boolean(enabled),
      plan_code: planCode,
      granted_at: enabled ? nowUtc() : null,
      revoked_at: enabled ? null : nowUtc(),
      created_at: nowUtc(),
      updated_at: nowUtc(),
    },
    { transaction },
  );
}

export default {
  listActivePlans,
  ensureFreeSubscription,
  getActiveSubscription,
  getUserPlanContext,
  resolveOrgOwnerUserId,
  checkCreateOrganisation,
  checkCreateEmployee,
  checkCreateCustomer,
  checkCreateJob,
  checkGenerateTimesheet,
  recordTimesheetGenerated,
  checkGenerateReport,
  recordReportGenerated,
  canSendEmailNotifications,
  canAccessSystemLogs,
  assertBooleanFeature,
  getFeatureLimit,
  serializeSubscriptionForApi,
  buildUsageSnapshot,
  recordSubscriptionHistory,
  syncSystemLogsAccess,
  getPlanByCode,
  serializePlan,
  FEATURE_KEYS,
  PLAN_CODES,
};
