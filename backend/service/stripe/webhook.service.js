import moment from "moment";
import models from "../../models/index.js";
import { constructWebhookEvent } from "./stripe.client.js";
import billingService from "./billing.service.js";
import subscriptionService from "../subscription/subscription.service.js";
import { enqueueSubscriptionNotify } from "../../queue-jobs/subscription-notify.job.js";
import { SUBSCRIPTION_NOTIFICATION_TYPES } from "../../config/subscription.config.js";

const { StripeEvents, WebhookLogs, StripeCustomers, Subscriptions } = models;

function nowUtc() {
  return moment().utc().format();
}

async function resolveUserIdFromCustomer(customerRef) {
  const customerId =
    typeof customerRef === "string" ? customerRef : customerRef?.id;
  if (!customerId) return null;
  const row = await StripeCustomers.findOne({
    where: { stripe_customer_id: customerId, deleted_at: null },
  });
  return row?.user_id || null;
}

async function resolveUserIdFromSubscription(subscriptionRef) {
  const subId =
    typeof subscriptionRef === "string"
      ? subscriptionRef
      : subscriptionRef?.id;
  if (!subId) return null;
  const local = await Subscriptions.findOne({
    where: { stripe_subscription_id: subId },
  });
  if (local) return local.user_id;
  if (typeof subscriptionRef === "object" && subscriptionRef?.metadata?.user_id) {
    return Number(subscriptionRef.metadata.user_id);
  }
  return null;
}

/**
 * Verify signature, persist event idempotently, process.
 */
export async function handleStripeWebhook({ rawBody, signature, headers }) {
  const started = Date.now();
  let event;
  let logPayload = {
    provider: "stripe",
    request_headers: {
      "stripe-signature": signature ? "[present]" : "[missing]",
    },
    created_at: nowUtc(),
  };

  try {
    event = constructWebhookEvent(rawBody, signature);
  } catch (err) {
    await WebhookLogs.create({
      ...logPayload,
      success: false,
      http_status: 400,
      error_message: err.message,
      duration_ms: Date.now() - started,
    });
    const e = new Error(`Webhook signature verification failed: ${err.message}`);
    e.statusCode = 400;
    throw e;
  }

  logPayload = {
    ...logPayload,
    stripe_event_id: event.id,
    event_type: event.type,
  };

  const [stripeEvent, created] = await StripeEvents.findOrCreate({
    where: { stripe_event_id: event.id },
    defaults: {
      type: event.type,
      api_version: event.api_version || null,
      livemode: Boolean(event.livemode),
      processing_status: "received",
      payload: event,
      created_at: nowUtc(),
    },
  });

  if (!created && stripeEvent.processing_status === "processed") {
    await WebhookLogs.create({
      ...logPayload,
      success: true,
      http_status: 200,
      response_body: { duplicate: true },
      duration_ms: Date.now() - started,
    });
    return { received: true, duplicate: true };
  }

  await stripeEvent.update({
    processing_status: "processing",
    updated_at: nowUtc(),
  });

  try {
    await processStripeEvent(event);
    await stripeEvent.update({
      processing_status: "processed",
      processed_at: nowUtc(),
      updated_at: nowUtc(),
    });
    await WebhookLogs.create({
      ...logPayload,
      success: true,
      http_status: 200,
      response_body: { processed: true },
      duration_ms: Date.now() - started,
    });
    return { received: true, processed: true };
  } catch (err) {
    await stripeEvent.update({
      processing_status: "failed",
      error_message: err.message,
      updated_at: nowUtc(),
    });
    await WebhookLogs.create({
      ...logPayload,
      success: false,
      http_status: 500,
      error_message: err.message,
      duration_ms: Date.now() - started,
    });
    throw err;
  }
}

async function processStripeEvent(event) {
  const obj = event.data?.object;
  switch (event.type) {
    case "checkout.session.completed": {
      if (obj.mode === "subscription" && obj.subscription) {
        const stripe = (await import("./stripe.client.js")).getStripe();
        const sub = await stripe.subscriptions.retrieve(obj.subscription);
        const local = await billingService.syncSubscriptionFromStripe(sub);
        if (local) {
          await enqueueSubscriptionNotify({
            userId: local.user_id,
            subscriptionId: local.id,
            type: SUBSCRIPTION_NOTIFICATION_TYPES.PLAN_UPGRADED,
            title: "Welcome to Pro",
            body: "Your Pro subscription is now active.",
          });
        }
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const local = await billingService.syncSubscriptionFromStripe(obj);
      if (local && event.type === "customer.subscription.updated") {
        if (obj.cancel_at_period_end) {
          await enqueueSubscriptionNotify({
            userId: local.user_id,
            subscriptionId: local.id,
            type: SUBSCRIPTION_NOTIFICATION_TYPES.PLAN_CANCELLED,
            title: "Cancellation scheduled",
            body: "Your Pro plan will end at the current billing period.",
          });
        }
      }
      break;
    }
    case "customer.subscription.deleted": {
      const local = await billingService.syncSubscriptionFromStripe(obj);
      const userId =
        local?.user_id ||
        (await resolveUserIdFromSubscription(obj)) ||
        (await resolveUserIdFromCustomer(obj.customer));
      if (userId) {
        await billingService.downgradeToFree(userId, "subscription_deleted");
        await enqueueSubscriptionNotify({
          userId,
          subscriptionId: local?.id,
          type: SUBSCRIPTION_NOTIFICATION_TYPES.EXPIRED,
          title: "Subscription ended",
          body: "Your Pro subscription has ended. You are now on the Free plan. Your data is preserved.",
        });
      }
      break;
    }
    case "invoice.paid":
    case "invoice.payment_succeeded": {
      const userId =
        (await resolveUserIdFromSubscription(obj.subscription)) ||
        (await resolveUserIdFromCustomer(obj.customer));
      if (!userId) break;
      const sub = await Subscriptions.findOne({
        where: {
          user_id: userId,
          stripe_subscription_id:
            typeof obj.subscription === "string"
              ? obj.subscription
              : obj.subscription?.id || null,
        },
      });
      await billingService.upsertBillingFromInvoice(obj, userId, sub?.id);
      await billingService.recordPaymentAttempt({
        userId,
        subscriptionId: sub?.id,
        invoice: obj,
        status: "succeeded",
      });
      if (sub) {
        await sub.update({ payment_status: "paid", updated_at: nowUtc() });
      }
      await enqueueSubscriptionNotify({
        userId,
        subscriptionId: sub?.id,
        type:
          obj.billing_reason === "subscription_cycle"
            ? SUBSCRIPTION_NOTIFICATION_TYPES.PLAN_RENEWED
            : SUBSCRIPTION_NOTIFICATION_TYPES.PAYMENT_SUCCEEDED,
        title:
          obj.billing_reason === "subscription_cycle"
            ? "Subscription renewed"
            : "Payment successful",
        body: "Your payment was processed successfully.",
      });
      break;
    }
    case "invoice.payment_failed": {
      const userId =
        (await resolveUserIdFromSubscription(obj.subscription)) ||
        (await resolveUserIdFromCustomer(obj.customer));
      if (!userId) break;
      const sub = await Subscriptions.findOne({
        where: { user_id: userId },
        order: [["id", "DESC"]],
      });
      await billingService.upsertBillingFromInvoice(obj, userId, sub?.id);
      await billingService.recordPaymentAttempt({
        userId,
        subscriptionId: sub?.id,
        invoice: obj,
        status: "failed",
        failureMessage: obj.last_finalization_error?.message || "Payment failed",
      });
      if (sub) {
        await sub.update({
          payment_status: "failed",
          status: "past_due",
          updated_at: nowUtc(),
        });
      }
      await enqueueSubscriptionNotify({
        userId,
        subscriptionId: sub?.id,
        type: SUBSCRIPTION_NOTIFICATION_TYPES.PAYMENT_FAILED,
        title: "Payment failed",
        body: "We could not process your subscription payment. Please update your payment method.",
      });
      break;
    }
    case "invoice.finalized": {
      const userId =
        (await resolveUserIdFromSubscription(obj.subscription)) ||
        (await resolveUserIdFromCustomer(obj.customer));
      if (userId) {
        const sub = await Subscriptions.findOne({
          where: { user_id: userId },
          order: [["id", "DESC"]],
        });
        await billingService.upsertBillingFromInvoice(obj, userId, sub?.id);
      }
      break;
    }
    default:
      break;
  }
}

export default { handleStripeWebhook };
