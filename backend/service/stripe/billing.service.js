import { Op } from "sequelize";
import moment from "moment";
import models from "../../models/index.js";
import { getStripe } from "./stripe.client.js";
import {
  assertStripeConfigured,
  BILLING_INTERVALS,
  getStripeConfig,
  PLAN_CODES,
} from "../../config/subscription.config.js";
import subscriptionService from "../subscription/subscription.service.js";
import { enqueueSubscriptionNotify } from "../../queue-jobs/subscription-notify.job.js";

const {
  StripeCustomers,
  Subscriptions,
  PlanPrices,
  Plans,
  BillingHistory,
  InvoiceHistory,
  PaymentAttempts,
} = models;

function nowUtc() {
  return moment().utc().format();
}

export async function getOrCreateStripeCustomer(user, { transaction } = {}) {
  assertStripeConfigured();
  const existing = await StripeCustomers.findOne({
    where: { user_id: user.id, deleted_at: null },
    transaction,
  });
  if (existing) return existing;

  const stripe = getStripe();
  const customer = await stripe.customers.create(
    {
      email: user.email,
      name: [user.first_name, user.last_name].filter(Boolean).join(" ") || undefined,
      metadata: { user_id: String(user.id) },
    },
    { idempotencyKey: `customer-user-${user.id}` },
  );

  return StripeCustomers.create(
    {
      user_id: user.id,
      stripe_customer_id: customer.id,
      email: user.email,
      metadata: { source: "mytask" },
      created_at: nowUtc(),
      updated_at: nowUtc(),
    },
    { transaction },
  );
}

function resolvePriceId(planPrice, interval) {
  if (planPrice?.stripe_price_id) return planPrice.stripe_price_id;
  const cfg = getStripeConfig();
  if (interval === BILLING_INTERVALS.MONTH) return cfg.priceProMonthly;
  if (interval === BILLING_INTERVALS.YEAR) return cfg.priceProYearly;
  return "";
}

export async function createCheckoutSession(user, { interval, successUrl, cancelUrl }) {
  assertStripeConfigured();
  if (![BILLING_INTERVALS.MONTH, BILLING_INTERVALS.YEAR].includes(interval)) {
    const err = new Error("billing_interval must be month or year");
    err.statusCode = 400;
    throw err;
  }

  const ctx = await subscriptionService.getUserPlanContext(user.id);
  if (ctx.isPro && ctx.subscription.stripe_subscription_id) {
    const err = new Error(
      "You already have an active Pro subscription. Manage it from Billing Portal.",
    );
    err.statusCode = 409;
    err.code = "ALREADY_SUBSCRIBED";
    throw err;
  }

  const proPlan = await subscriptionService.getPlanByCode(PLAN_CODES.PRO);
  const planPrice = (proPlan.prices || []).find(
    (p) => p.billing_interval === interval,
  );
  const priceId = resolvePriceId(planPrice, interval);
  if (!priceId) {
    const err = new Error(
      `Stripe price for Pro ${interval}ly is not configured. Set STRIPE_PRICE_PRO_${interval === "month" ? "MONTHLY" : "YEARLY"}.`,
    );
    err.statusCode = 503;
    throw err;
  }

  const stripeCustomer = await getOrCreateStripeCustomer(user);
  const cfg = getStripeConfig();
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create(
    {
      mode: "subscription",
      customer: stripeCustomer.stripe_customer_id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl || cfg.successUrl,
      cancel_url: cancelUrl || cfg.cancelUrl,
      client_reference_id: String(user.id),
      metadata: {
        user_id: String(user.id),
        plan_code: PLAN_CODES.PRO,
        billing_interval: interval,
      },
      subscription_data: {
        metadata: {
          user_id: String(user.id),
          plan_code: PLAN_CODES.PRO,
          billing_interval: interval,
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: "auto",
    },
    { idempotencyKey: `checkout-${user.id}-${interval}-${Date.now()}` },
  );

  return {
    checkout_url: session.url,
    session_id: session.id,
  };
}

export async function createBillingPortalSession(user, { returnUrl } = {}) {
  assertStripeConfigured();
  const stripeCustomer = await getOrCreateStripeCustomer(user);
  const cfg = getStripeConfig();
  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomer.stripe_customer_id,
    return_url: returnUrl || cfg.portalReturnUrl,
  });
  return { portal_url: session.url };
}

export async function cancelSubscription(user, { immediate = false } = {}) {
  const ctx = await subscriptionService.getUserPlanContext(user.id);
  if (!ctx.isPro || !ctx.subscription.stripe_subscription_id) {
    const err = new Error("No cancellable Pro subscription found");
    err.statusCode = 400;
    throw err;
  }

  assertStripeConfigured();
  const stripe = getStripe();
  const stripeSubId = ctx.subscription.stripe_subscription_id;

  let updated;
  if (immediate) {
    updated = await stripe.subscriptions.cancel(stripeSubId);
  } else {
    updated = await stripe.subscriptions.update(stripeSubId, {
      cancel_at_period_end: true,
    });
  }

  await ctx.subscription.update({
    cancel_at_period_end: Boolean(updated.cancel_at_period_end),
    canceled_at: updated.canceled_at
      ? moment.unix(updated.canceled_at).utc().format()
      : nowUtc(),
    status: updated.status,
    updated_at: nowUtc(),
  });

  await subscriptionService.recordSubscriptionHistory({
    subscriptionId: ctx.subscription.id,
    userId: user.id,
    fromPlanId: ctx.plan.id,
    toPlanId: ctx.plan.id,
    eventType: immediate ? "cancelled_immediate" : "cancel_at_period_end",
    previousStatus: ctx.subscription.status,
    newStatus: updated.status,
    notes: immediate
      ? "Subscription cancelled immediately"
      : "Subscription set to cancel at period end",
  });

  await enqueueSubscriptionNotify({
    userId: user.id,
    subscriptionId: ctx.subscription.id,
    type: "plan_cancelled",
    title: "Subscription cancelled",
    body: immediate
      ? "Your Pro subscription has been cancelled."
      : "Your Pro subscription will end at the current billing period.",
  });

  return subscriptionService.serializeSubscriptionForApi(user.id);
}

export async function listBillingHistory(userId, { page = 1, limit = 20 } = {}) {
  const offset = (Math.max(1, page) - 1) * limit;
  const { count, rows } = await BillingHistory.findAndCountAll({
    where: { user_id: userId, deleted_at: null },
    include: [{ model: Plans, as: "plan", required: false }],
    order: [["created_at", "DESC"]],
    limit,
    offset,
  });

  return {
    data: rows.map((r) => {
      const plain = r.get({ plain: true });
      return {
        id: plain.id,
        invoice_number: plain.invoice_number,
        plan: plain.plan
          ? { id: plain.plan.id, code: plain.plan.code, name: plain.plan.name }
          : null,
        amount_cents: plain.amount_cents,
        currency: plain.currency,
        status: plain.status,
        payment_method:
          plain.payment_method_brand && plain.payment_method_last4
            ? `${plain.payment_method_brand} •••• ${plain.payment_method_last4}`
            : null,
        invoice_pdf_url: plain.invoice_pdf_url,
        hosted_invoice_url: plain.hosted_invoice_url,
        paid_at: plain.paid_at,
        period_start: plain.period_start,
        period_end: plain.period_end,
        created_at: plain.created_at,
      };
    }),
    pagination: {
      total_rows: count,
      rows_per_page: limit,
      page_number: page,
      total_pages: Math.ceil(count / limit) || 1,
    },
  };
}

export async function upsertBillingFromInvoice(invoice, userId, subscriptionId) {
  const paidAt = invoice.status_transitions?.paid_at
    ? moment.unix(invoice.status_transitions.paid_at).utc().format()
    : invoice.status === "paid"
      ? nowUtc()
      : null;

  const [row] = await BillingHistory.findOrCreate({
    where: { stripe_invoice_id: invoice.id },
    defaults: {
      user_id: userId,
      subscription_id: subscriptionId || null,
      invoice_number: invoice.number || null,
      stripe_payment_intent_id:
        typeof invoice.payment_intent === "string"
          ? invoice.payment_intent
          : invoice.payment_intent?.id || null,
      amount_cents: invoice.amount_paid ?? invoice.total ?? 0,
      currency: (invoice.currency || "usd").toLowerCase(),
      status: invoice.status || "open",
      billing_reason: invoice.billing_reason || null,
      invoice_pdf_url: invoice.invoice_pdf || null,
      hosted_invoice_url: invoice.hosted_invoice_url || null,
      period_start: invoice.period_start
        ? moment.unix(invoice.period_start).utc().format()
        : null,
      period_end: invoice.period_end
        ? moment.unix(invoice.period_end).utc().format()
        : null,
      paid_at: paidAt,
      created_at: nowUtc(),
      updated_at: nowUtc(),
    },
  });

  if (!row.isNewRecord) {
    await row.update({
      status: invoice.status || row.status,
      amount_cents: invoice.amount_paid ?? invoice.total ?? row.amount_cents,
      invoice_pdf_url: invoice.invoice_pdf || row.invoice_pdf_url,
      hosted_invoice_url: invoice.hosted_invoice_url || row.hosted_invoice_url,
      paid_at: paidAt || row.paid_at,
      updated_at: nowUtc(),
    });
  }

  await InvoiceHistory.findOrCreate({
    where: { stripe_invoice_id: invoice.id },
    defaults: {
      user_id: userId,
      billing_history_id: row.id,
      raw_payload: invoice,
      synced_at: nowUtc(),
      created_at: nowUtc(),
    },
  });

  return row;
}

export async function recordPaymentAttempt({
  userId,
  subscriptionId,
  invoice,
  status,
  failureCode,
  failureMessage,
}) {
  return PaymentAttempts.create({
    user_id: userId,
    subscription_id: subscriptionId || null,
    stripe_payment_intent_id:
      typeof invoice?.payment_intent === "string"
        ? invoice.payment_intent
        : invoice?.payment_intent?.id || null,
    stripe_invoice_id: invoice?.id || null,
    amount_cents: invoice?.amount_due ?? invoice?.total ?? null,
    currency: invoice?.currency || null,
    status,
    failure_code: failureCode || null,
    failure_message: failureMessage || null,
    created_at: nowUtc(),
  });
}

/**
 * Apply a Stripe subscription object onto local DB (idempotent upsert).
 */
export async function syncSubscriptionFromStripe(stripeSubscription) {
  const userId = Number(
    stripeSubscription.metadata?.user_id ||
      stripeSubscription.client_reference_id ||
      0,
  );
  if (!userId) {
    // Try resolve via customer
    const customerId =
      typeof stripeSubscription.customer === "string"
        ? stripeSubscription.customer
        : stripeSubscription.customer?.id;
    if (!customerId) return null;
    const sc = await StripeCustomers.findOne({
      where: { stripe_customer_id: customerId, deleted_at: null },
    });
    if (!sc) return null;
    return syncSubscriptionForUser(sc.user_id, stripeSubscription);
  }
  return syncSubscriptionForUser(userId, stripeSubscription);
}

async function syncSubscriptionForUser(userId, stripeSubscription) {
  const interval =
    stripeSubscription.metadata?.billing_interval ||
    stripeSubscription.items?.data?.[0]?.price?.recurring?.interval ||
    "month";

  const proPlan = await subscriptionService.getPlanByCode(PLAN_CODES.PRO);
  const planPrice = (proPlan.prices || []).find(
    (p) => p.billing_interval === interval,
  );

  let local = await Subscriptions.findOne({
    where: { stripe_subscription_id: stripeSubscription.id },
  });

  const previous = local
    ? { plan_id: local.plan_id, status: local.status }
    : null;

  // End any other active free/pro rows for this user that aren't this Stripe sub
  const activeOthers = await Subscriptions.findAll({
    where: {
      user_id: userId,
      deleted_at: null,
      status: { [Op.in]: ["active", "trialing", "past_due"] },
    },
  });
  for (const other of activeOthers) {
    if (
      other.stripe_subscription_id &&
      other.stripe_subscription_id !== stripeSubscription.id
    ) {
      continue;
    }
    if (!other.stripe_subscription_id && other.id !== local?.id) {
      await other.update({
        status: "expired",
        ended_at: nowUtc(),
        updated_at: nowUtc(),
      });
    }
  }

  const payload = {
    user_id: userId,
    plan_id: proPlan.id,
    plan_price_id: planPrice?.id || null,
    status: stripeSubscription.status,
    billing_interval: interval,
    stripe_subscription_id: stripeSubscription.id,
    stripe_customer_id:
      typeof stripeSubscription.customer === "string"
        ? stripeSubscription.customer
        : stripeSubscription.customer?.id || null,
    current_period_start: stripeSubscription.current_period_start
      ? moment.unix(stripeSubscription.current_period_start).utc().format()
      : null,
    current_period_end: stripeSubscription.current_period_end
      ? moment.unix(stripeSubscription.current_period_end).utc().format()
      : null,
    cancel_at_period_end: Boolean(stripeSubscription.cancel_at_period_end),
    canceled_at: stripeSubscription.canceled_at
      ? moment.unix(stripeSubscription.canceled_at).utc().format()
      : null,
    ended_at: stripeSubscription.ended_at
      ? moment.unix(stripeSubscription.ended_at).utc().format()
      : null,
    trial_end: stripeSubscription.trial_end
      ? moment.unix(stripeSubscription.trial_end).utc().format()
      : null,
    payment_status:
      stripeSubscription.status === "active" ||
      stripeSubscription.status === "trialing"
        ? "paid"
        : stripeSubscription.status === "past_due"
          ? "failed"
          : "pending",
    updated_at: nowUtc(),
  };

  if (local) {
    await local.update(payload);
  } else {
    local = await Subscriptions.create({
      ...payload,
      created_at: nowUtc(),
    });
  }

  const isActive = ["active", "trialing", "past_due"].includes(
    stripeSubscription.status,
  );
  await subscriptionService.syncSystemLogsAccess(
    userId,
    isActive ? PLAN_CODES.PRO : PLAN_CODES.FREE,
    isActive,
  );

  if (
    !previous ||
    previous.plan_id !== local.plan_id ||
    previous.status !== local.status
  ) {
    await subscriptionService.recordSubscriptionHistory({
      subscriptionId: local.id,
      userId,
      fromPlanId: previous?.plan_id,
      toPlanId: local.plan_id,
      eventType: "stripe_sync",
      previousStatus: previous?.status,
      newStatus: local.status,
      notes: "Synced from Stripe subscription",
      metadata: { stripe_subscription_id: stripeSubscription.id },
    });
  }

  // When cancelled/expired, restore Free
  if (
    ["canceled", "unpaid", "incomplete_expired", "paused"].includes(
      stripeSubscription.status,
    ) ||
    (stripeSubscription.status === "canceled" && stripeSubscription.ended_at)
  ) {
    await subscriptionService.ensureFreeSubscription(userId);
    await subscriptionService.syncSystemLogsAccess(userId, PLAN_CODES.FREE, false);
  }

  return local;
}

export async function downgradeToFree(userId, reason = "expired") {
  const ctx = await subscriptionService.getUserPlanContext(userId);
  if (ctx.planCode === PLAN_CODES.FREE) return ctx.subscription;

  await ctx.subscription.update({
    status: "expired",
    ended_at: nowUtc(),
    updated_at: nowUtc(),
  });

  await subscriptionService.recordSubscriptionHistory({
    subscriptionId: ctx.subscription.id,
    userId,
    fromPlanId: ctx.plan.id,
    toPlanId: null,
    eventType: reason,
    previousStatus: ctx.subscription.status,
    newStatus: "expired",
    notes: `Downgraded to Free (${reason}). Data preserved; Free limits enforced.`,
  });

  await subscriptionService.syncSystemLogsAccess(userId, PLAN_CODES.FREE, false);
  return subscriptionService.ensureFreeSubscription(userId);
}

export default {
  getOrCreateStripeCustomer,
  createCheckoutSession,
  createBillingPortalSession,
  cancelSubscription,
  listBillingHistory,
  upsertBillingFromInvoice,
  recordPaymentAttempt,
  syncSubscriptionFromStripe,
  downgradeToFree,
};
