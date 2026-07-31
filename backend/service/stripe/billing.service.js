import { Op } from "sequelize";
import moment from "moment";
import models from "../../models/index.js";
import { getStripe } from "./stripe.client.js";
import {
  assertStripeConfigured,
  BILLING_INTERVALS,
  endReasonMessage,
  getStripeConfig,
  PLAN_CODES,
  SUBSCRIPTION_END_REASONS,
} from "../../config/subscription.config.js";
import subscriptionService from "../subscription/subscription.service.js";
import { enqueueSubscriptionNotify } from "../../queue-jobs/subscription-notify.job.js";
import { enqueueSendEmail } from "../../queue-jobs/send-email.job.js";

const {
  Users,
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

function isValidStripePriceId(id) {
  return (
    typeof id === "string" &&
    /^price_[A-Za-z0-9]+$/.test(id) &&
    !id.includes("...")
  );
}

/**
 * Prefer live env price IDs over DB (migration may have seeded placeholders).
 */
function resolvePriceId(planPrice, interval) {
  const cfg = getStripeConfig();
  const fromEnv =
    interval === BILLING_INTERVALS.MONTH
      ? cfg.priceProMonthly
      : interval === BILLING_INTERVALS.YEAR
        ? cfg.priceProYearly
        : "";
  if (isValidStripePriceId(fromEnv)) return fromEnv;
  if (isValidStripePriceId(planPrice?.stripe_price_id)) {
    return planPrice.stripe_price_id;
  }
  return "";
}

async function syncPlanPriceFromEnv(planPrice, interval) {
  if (!planPrice?.id) return;
  const fromEnv = resolvePriceId(null, interval);
  if (!fromEnv || planPrice.stripe_price_id === fromEnv) return;
  const cfg = getStripeConfig();
  await PlanPrices.update(
    {
      stripe_price_id: fromEnv,
      stripe_product_id: cfg.productPro || planPrice.stripe_product_id,
      updated_at: nowUtc(),
    },
    { where: { id: planPrice.id } },
  );
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
  await syncPlanPriceFromEnv(planPrice, interval);
  const priceId = resolvePriceId(planPrice, interval);
  if (!priceId) {
    const err = new Error(
      `Stripe price for Pro ${interval}ly is not configured. Set a real Price ID in STRIPE_PRICE_PRO_${interval === "month" ? "MONTHLY" : "YEARLY"} (from Product catalog → price → Price ID). Do not use the placeholder price_...`,
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

/**
 * Confirm Checkout Session and sync subscription (works even if webhooks are delayed).
 */
export async function confirmCheckoutSession(user, sessionId) {
  assertStripeConfigured();
  if (!sessionId) {
    const err = new Error("session_id is required");
    err.statusCode = 400;
    throw err;
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  });

  const sessionUserId = Number(
    session.client_reference_id || session.metadata?.user_id || 0,
  );
  if (sessionUserId && sessionUserId !== Number(user.id)) {
    const err = new Error("Checkout session does not belong to this user");
    err.statusCode = 403;
    throw err;
  }

  if (session.mode !== "subscription") {
    const err = new Error("Checkout session is not a subscription");
    err.statusCode = 400;
    throw err;
  }

  let stripeSubscription = session.subscription;
  if (typeof stripeSubscription === "string") {
    stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscription);
  }
  if (!stripeSubscription) {
    // Fallback: latest active sub for this Stripe customer
    const customerId =
      typeof session.customer === "string"
        ? session.customer
        : session.customer?.id;
    if (customerId) {
      const list = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });
      stripeSubscription = list.data[0] || null;
    }
  }

  if (!stripeSubscription) {
    const err = new Error(
      "Subscription not ready yet. Refresh in a moment, or ensure Stripe webhooks are forwarding.",
    );
    err.statusCode = 409;
    err.code = "SUBSCRIPTION_PENDING";
    throw err;
  }

  // Ensure metadata has user_id for sync
  if (!stripeSubscription.metadata?.user_id) {
    stripeSubscription.metadata = {
      ...(stripeSubscription.metadata || {}),
      user_id: String(user.id),
      billing_interval:
        stripeSubscription.metadata?.billing_interval ||
        session.metadata?.billing_interval ||
        "month",
    };
  }

  await syncSubscriptionFromStripe(stripeSubscription);
  await syncInvoicesForUser(user.id, { sendEmail: true });
  return subscriptionService.serializeSubscriptionForApi(user.id);
}

/**
 * Pull latest Stripe subscription for the user and sync locally.
 */
export async function syncCurrentUserFromStripe(user) {
  assertStripeConfigured();
  const stripeCustomer = await StripeCustomers.findOne({
    where: { user_id: user.id, deleted_at: null },
  });
  if (!stripeCustomer) {
    await subscriptionService.ensureFreeSubscription(user.id);
    return subscriptionService.serializeSubscriptionForApi(user.id);
  }

  const stripe = getStripe();
  const list = await stripe.subscriptions.list({
    customer: stripeCustomer.stripe_customer_id,
    status: "all",
    limit: 10,
  });
  const active = list.data.find((s) =>
    ["active", "trialing"].includes(s.status),
  );
  const problematic = list.data.find((s) =>
    ["past_due", "unpaid", "canceled", "incomplete_expired"].includes(s.status),
  );
  if (active) {
    await syncSubscriptionFromStripe(active);
  } else if (problematic) {
    await syncSubscriptionFromStripe(problematic);
  } else {
    await subscriptionService.ensureFreeSubscription(user.id);
  }
  await syncInvoicesForUser(user.id, { sendEmail: true });
  return subscriptionService.serializeSubscriptionForApi(user.id);
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

  if (immediate) {
    await downgradeToFree(user.id, SUBSCRIPTION_END_REASONS.CANCELLED_IMMEDIATE);
  }

  await enqueueSubscriptionNotify({
    userId: user.id,
    subscriptionId: ctx.subscription.id,
    type: "plan_cancelled",
    title: immediate ? "Subscription cancelled" : "Cancellation scheduled",
    body: immediate
      ? endReasonMessage(SUBSCRIPTION_END_REASONS.CANCELLED_IMMEDIATE)
      : "Your Pro subscription will end at the current billing period. You keep Pro until then.",
    forceEmail: true,
    metadata: {
      reason: immediate
        ? SUBSCRIPTION_END_REASONS.CANCELLED_IMMEDIATE
        : "cancel_at_period_end",
    },
    immediate: true,
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

export async function upsertBillingFromInvoice(invoice, userId, subscriptionId, options = {}) {
  const { sendEmail = false } = options;
  const paidAt = invoice.status_transitions?.paid_at
    ? moment.unix(invoice.status_transitions.paid_at).utc().format()
    : invoice.status === "paid"
      ? nowUtc()
      : null;

  const proPlan = await subscriptionService.getPlanByCode(PLAN_CODES.PRO);
  const lineDesc = invoice.lines?.data?.[0]?.description || "";
  const intervalGuess = /year/i.test(lineDesc) ? "year" : "month";

  const [row, created] = await BillingHistory.findOrCreate({
    where: { stripe_invoice_id: invoice.id },
    defaults: {
      user_id: userId,
      subscription_id: subscriptionId || null,
      plan_id: proPlan?.id || null,
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
      metadata: {
        line_description: lineDesc || null,
        billing_interval: intervalGuess,
        email_sent: false,
      },
      created_at: nowUtc(),
      updated_at: nowUtc(),
    },
  });

  if (!created) {
    await row.update({
      status: invoice.status || row.status,
      plan_id: row.plan_id || proPlan?.id || null,
      subscription_id: subscriptionId || row.subscription_id,
      invoice_number: invoice.number || row.invoice_number,
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

  const meta = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  if (sendEmail && invoice.status === "paid" && !meta.email_sent) {
    try {
      await sendInvoiceReceiptEmail(userId, invoice, row);
      await row.update({
        metadata: { ...meta, email_sent: true, email_sent_at: nowUtc() },
        updated_at: nowUtc(),
      });
    } catch (err) {
      console.error("invoice email failed:", err?.message || err);
    }
  }

  return row;
}

async function sendInvoiceReceiptEmail(userId, invoice, billingRow) {
  const user = await Users.findByPk(userId);
  if (!user?.email) return;

  const amount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: (invoice.currency || "usd").toUpperCase(),
  }).format((invoice.amount_paid ?? invoice.total ?? 0) / 100);

  const paidOn = invoice.status_transitions?.paid_at
    ? moment.unix(invoice.status_transitions.paid_at).utc().format("ll")
    : billingRow.paid_at
      ? moment(billingRow.paid_at).utc().format("ll")
      : moment().utc().format("ll");

  const periodStart = invoice.lines?.data?.[0]?.period?.start
    ? moment.unix(invoice.lines.data[0].period.start).utc().format("ll")
    : invoice.period_start
      ? moment.unix(invoice.period_start).utc().format("ll")
      : "—";
  const periodEnd = invoice.lines?.data?.[0]?.period?.end
    ? moment.unix(invoice.lines.data[0].period.end).utc().format("ll")
    : invoice.period_end
      ? moment.unix(invoice.period_end).utc().format("ll")
      : "—";

  const lineDesc =
    invoice.lines?.data?.[0]?.description || "myTask Pro subscription";
  const billingCycle = /year/i.test(lineDesc) ? "Yearly" : "Monthly";
  const appName = process.env.APP_NAME || "myTask";
  const downloadUrl =
    invoice.invoice_pdf ||
    invoice.hosted_invoice_url ||
    `${process.env.CLIENT_URL || ""}/billing`;

  const attachments = [];
  if (invoice.invoice_pdf) {
    try {
      const pdfRes = await fetch(invoice.invoice_pdf);
      if (pdfRes.ok) {
        const buf = Buffer.from(await pdfRes.arrayBuffer());
        attachments.push({
          filename: `${invoice.number || "invoice"}.pdf`,
          content: buf,
          contentType: "application/pdf",
        });
      }
    } catch (err) {
      console.error("invoice pdf attach failed:", err?.message || err);
    }
  }

  await enqueueSendEmail({
    user,
    organisation: null,
    userEmails: [user.email],
    message: {
      subject: `${appName} invoice ${invoice.number || ""}`.trim(),
      template: "invoice-receipt.html",
      feature: "Billing",
      variables: {
        title: "Payment receipt",
        message: `Thanks for your payment. Your ${appName} Pro subscription invoice is ready.`,
        invoice_number: invoice.number || billingRow.invoice_number || "—",
        plan_name: "Pro",
        billing_cycle: billingCycle,
        amount_paid: amount,
        invoice_status: (invoice.status || "paid").toUpperCase(),
        paid_on: paidOn,
        period_label: `${periodStart} → ${periodEnd}`,
        button_url: downloadUrl,
        button_label: invoice.invoice_pdf ? "Download invoice PDF" : "View invoice",
      },
      attachments,
    },
    immediate: true,
  });
}

/**
 * Pull invoices from Stripe for a user and upsert billing history.
 */
export async function syncInvoicesForUser(userId, { sendEmail = false } = {}) {
  assertStripeConfigured();
  const stripeCustomer = await StripeCustomers.findOne({
    where: { user_id: userId, deleted_at: null },
  });
  if (!stripeCustomer) return { synced: 0 };

  const stripe = getStripe();
  const invoices = await stripe.invoices.list({
    customer: stripeCustomer.stripe_customer_id,
    limit: 50,
  });

  const localSub = await Subscriptions.findOne({
    where: { user_id: userId },
    order: [["id", "DESC"]],
  });

  let synced = 0;
  for (const invoice of invoices.data) {
    await upsertBillingFromInvoice(invoice, userId, localSub?.id || null, {
      sendEmail:
        sendEmail &&
        invoice.status === "paid" &&
        (invoice.billing_reason === "subscription_create" ||
          invoice.billing_reason === "subscription_cycle" ||
          invoice.billing_reason === "subscription_update"),
    });
    synced += 1;
  }
  return { synced };
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

  // Stripe API 2025+: period dates live on subscription items (not top-level).
  const primaryItem = stripeSubscription.items?.data?.[0];
  const periodStartUnix =
    stripeSubscription.current_period_start ||
    primaryItem?.current_period_start ||
    stripeSubscription.billing_cycle_anchor ||
    null;
  const periodEndUnix =
    stripeSubscription.current_period_end ||
    primaryItem?.current_period_end ||
    stripeSubscription.cancel_at ||
    null;

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
    current_period_start: periodStartUnix
      ? moment.unix(periodStartUnix).utc().format()
      : null,
    current_period_end: periodEndUnix
      ? moment.unix(periodEndUnix).utc().format()
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

  const isActive = ["active", "trialing"].includes(stripeSubscription.status);
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

  // Payment failure / unpaid / canceled → Free limits immediately
  if (stripeSubscription.status === "past_due") {
    await downgradeToFree(userId, SUBSCRIPTION_END_REASONS.PAYMENT_FAILED);
  } else if (stripeSubscription.status === "unpaid") {
    await downgradeToFree(userId, SUBSCRIPTION_END_REASONS.UNPAID);
  } else if (
    ["canceled", "incomplete_expired", "paused"].includes(
      stripeSubscription.status,
    )
  ) {
    await downgradeToFree(
      userId,
      stripeSubscription.cancel_at_period_end
        ? SUBSCRIPTION_END_REASONS.PERIOD_ENDED
        : SUBSCRIPTION_END_REASONS.SUBSCRIPTION_DELETED,
    );
  }

  return local;
}

export async function downgradeToFree(userId, reason = "expired") {
  const freePlan = await subscriptionService.getPlanByCode(PLAN_CODES.FREE);
  const proRow = await Subscriptions.findOne({
    where: {
      user_id: userId,
      deleted_at: null,
      plan_id: { [Op.ne]: freePlan.id },
      status: {
        [Op.in]: [
          "active",
          "trialing",
          "past_due",
          "unpaid",
          "canceled",
          "incomplete",
          "paused",
        ],
      },
    },
    include: [{ model: Plans, as: "plan", required: false }],
    order: [["id", "DESC"]],
  });

  if (proRow) {
    const previousStatus = proRow.status;
    await proRow.update({
      status: "expired",
      ended_at: nowUtc(),
      payment_status:
        reason === SUBSCRIPTION_END_REASONS.PAYMENT_FAILED ||
        reason === SUBSCRIPTION_END_REASONS.UNPAID
          ? "failed"
          : proRow.payment_status,
      metadata: {
        ...(proRow.metadata || {}),
        end_reason: reason,
        end_reason_message: endReasonMessage(reason),
      },
      updated_at: nowUtc(),
    });

    await subscriptionService.recordSubscriptionHistory({
      subscriptionId: proRow.id,
      userId,
      fromPlanId: proRow.plan_id,
      toPlanId: freePlan.id,
      eventType: reason,
      previousStatus,
      newStatus: "expired",
      notes: `Downgraded to Free (${reason}). Data preserved; Free limits enforced.`,
    });
  }

  await subscriptionService.syncSystemLogsAccess(userId, PLAN_CODES.FREE, false);
  const freeSub = await subscriptionService.ensureFreeSubscription(userId);
  const reasonMeta = {
    end_reason: reason,
    end_reason_message: endReasonMessage(reason),
    previous_plan: PLAN_CODES.PRO,
    downgraded_at: nowUtc(),
  };
  if (freeSub?.id) {
    await Subscriptions.update(
      {
        metadata: {
          ...(freeSub.metadata && typeof freeSub.metadata === "object"
            ? freeSub.metadata
            : {}),
          ...reasonMeta,
        },
        updated_at: nowUtc(),
      },
      { where: { id: freeSub.id } },
    );
  }
  return subscriptionService.getActiveSubscription(userId);
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
  confirmCheckoutSession,
  syncCurrentUserFromStripe,
  syncInvoicesForUser,
};
