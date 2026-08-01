import subscriptionService from "../service/subscription/subscription.service.js";
import billingService from "../service/stripe/billing.service.js";
import webhookService from "../service/stripe/webhook.service.js";
import { FEATURE_KEYS } from "../config/subscription.config.js";

export async function listPlans(req, res) {
  try {
    const plans = await subscriptionService.listActivePlans();
    let current = null;
    const user = req.body?.user;
    if (user?.id) {
      current = await subscriptionService.serializeSubscriptionForApi(user.id);
    }
    return res.status(200).json({
      data: { plans, current_subscription: current },
      message: "Plans loaded",
    });
  } catch (err) {
    console.error("listPlans:", err);
    return res.status(err.statusCode || 500).json({
      message: err.message || "Unable to load plans",
    });
  }
}

export async function getCurrentSubscription(req, res) {
  try {
    const { user } = req.body;
    await subscriptionService.ensureFreeSubscription(user.id);
    const data = await subscriptionService.serializeSubscriptionForApi(user.id);
    return res.status(200).json({ data, message: "Subscription loaded" });
  } catch (err) {
    console.error("getCurrentSubscription:", err);
    return res.status(err.statusCode || 500).json({
      message: err.message || "Unable to load subscription",
    });
  }
}

export async function getUsage(req, res) {
  try {
    const { user } = req.body;
    const data = await subscriptionService.buildUsageSnapshot(user.id);
    return res.status(200).json({ data, message: "Usage loaded" });
  } catch (err) {
    console.error("getUsage:", err);
    return res.status(err.statusCode || 500).json({
      message: err.message || "Unable to load usage",
    });
  }
}

export async function getFeatureLimits(req, res) {
  try {
    const { user } = req.body;
    const ctx = await subscriptionService.getUserPlanContext(user.id);
    return res.status(200).json({
      data: {
        plan_code: ctx.planCode,
        features: ctx.features,
        feature_keys: FEATURE_KEYS,
      },
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      message: err.message || "Unable to load feature limits",
    });
  }
}

export async function createCheckout(req, res) {
  try {
    const { user, billing_interval, success_url, cancel_url } = req.body;
    const data = await billingService.createCheckoutSession(user, {
      interval: billing_interval,
      successUrl: success_url,
      cancelUrl: cancel_url,
    });
    return res.status(200).json({
      data,
      message: "Checkout session created",
    });
  } catch (err) {
    console.error("createCheckout:", err);
    return res.status(err.statusCode || 500).json({
      message: err.message || "Unable to create checkout session",
      code: err.code,
    });
  }
}

export async function confirmCheckout(req, res) {
  try {
    const { user, session_id } = req.body;
    const data = await billingService.confirmCheckoutSession(user, session_id);
    return res.status(200).json({
      data,
      message: "Subscription confirmed",
    });
  } catch (err) {
    console.error("confirmCheckout:", err);
    return res.status(err.statusCode || 500).json({
      message: err.message || "Unable to confirm checkout",
      code: err.code,
    });
  }
}

export async function syncFromStripe(req, res) {
  try {
    const { user } = req.body;
    const data = await billingService.syncCurrentUserFromStripe(user);
    return res.status(200).json({
      data,
      message: "Subscription synced from Stripe",
    });
  } catch (err) {
    console.error("syncFromStripe:", err);
    return res.status(err.statusCode || 500).json({
      message: err.message || "Unable to sync subscription",
    });
  }
}

export async function createPortal(req, res) {
  try {
    const { user, return_url } = req.body;
    const data = await billingService.createBillingPortalSession(user, {
      returnUrl: return_url,
    });
    return res.status(200).json({
      data,
      message: "Billing portal session created",
    });
  } catch (err) {
    console.error("createPortal:", err);
    return res.status(err.statusCode || 500).json({
      message: err.message || "Unable to open billing portal",
    });
  }
}

export async function cancelSubscription(req, res) {
  try {
    const { user, immediate } = req.body;
    const data = await billingService.cancelSubscription(user, {
      immediate: Boolean(immediate),
    });
    return res.status(200).json({
      data,
      message: immediate
        ? "Subscription cancelled"
        : "Subscription will cancel at period end",
    });
  } catch (err) {
    console.error("cancelSubscription:", err);
    return res.status(err.statusCode || 500).json({
      message: err.message || "Unable to cancel subscription",
    });
  }
}

export async function billingHistory(req, res) {
  try {
    const { user } = req.body;
    const page = parseInt(req.query.page_number || req.query.page || "1", 10);
    const limit = parseInt(
      req.query.rows_per_page || req.query.per_page || "20",
      10,
    );
    const result = await billingService.listBillingHistory(user.id, {
      page,
      limit,
    });
    return res.status(200).json({
      data: result.data,
      pagination: result.pagination,
      message: "Billing history loaded",
    });
  } catch (err) {
    console.error("billingHistory:", err);
    return res.status(err.statusCode || 500).json({
      message: err.message || "Unable to load billing history",
    });
  }
}

export async function getBillingInvoice(req, res) {
  try {
    const { user } = req.body;
    const id = req.params.id;
    const { invoice } = await billingService.getBillingInvoiceForUser(
      user.id,
      id,
    );
    return res.status(200).json({
      data: invoice,
      message: "Invoice loaded",
    });
  } catch (err) {
    console.error("getBillingInvoice:", err);
    return res.status(err.statusCode || 500).json({
      message: err.message || "Unable to load invoice",
    });
  }
}

export async function downloadBillingInvoicePdf(req, res) {
  try {
    const { user } = req.body;
    const id = req.params.id;
    const { buffer, filename } = await billingService.buildMyTaskInvoicePdf(
      user.id,
      id,
    );
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`,
    );
    return res.status(200).send(buffer);
  } catch (err) {
    console.error("downloadBillingInvoicePdf:", err);
    return res.status(err.statusCode || 500).json({
      message: err.message || "Unable to download invoice PDF",
    });
  }
}

export async function viewBillingInvoiceHtml(req, res) {
  try {
    const { user } = req.body;
    const id = req.params.id;
    const { html } = await billingService.buildMyTaskInvoiceHtml(user.id, id);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(html);
  } catch (err) {
    console.error("viewBillingInvoiceHtml:", err);
    return res.status(err.statusCode || 500).json({
      message: err.message || "Unable to view invoice",
    });
  }
}

export async function planComparison(req, res) {
  try {
    const plans = await subscriptionService.listActivePlans();
    const keys = Object.values(FEATURE_KEYS);
    const comparison = keys.map((key) => {
      const row = { feature_key: key };
      for (const p of plans) {
        row[p.code] = p.features?.[key] ?? null;
      }
      return row;
    });
    return res.status(200).json({
      data: { plans, comparison },
    });
  } catch (err) {
    return res.status(500).json({
      message: err.message || "Unable to load plan comparison",
    });
  }
}

/**
 * Stripe webhook — requires raw body (mounted separately in index.js).
 */
export async function stripeWebhook(req, res) {
  try {
    const signature = req.headers["stripe-signature"];
    const rawBody = req.rawBody || req.body;
    const result = await webhookService.handleStripeWebhook({
      rawBody,
      signature,
      headers: req.headers,
    });
    return res.status(200).json(result);
  } catch (err) {
    console.error("stripeWebhook:", err?.message || err);
    return res.status(err.statusCode || 400).json({
      message: err.message || "Webhook error",
    });
  }
}
