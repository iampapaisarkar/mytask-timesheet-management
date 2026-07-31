import Stripe from "stripe";
import { assertStripeConfigured, getStripeConfig } from "../../config/subscription.config.js";

let stripeClient = null;

export function getStripe() {
  if (stripeClient) return stripeClient;
  const cfg = assertStripeConfigured();
  stripeClient = new Stripe(cfg.secretKey, {
    maxNetworkRetries: 2,
    timeout: 20000,
  });
  return stripeClient;
}

export function constructWebhookEvent(rawBody, signature) {
  const cfg = getStripeConfig();
  if (!cfg.webhookSecret) {
    const err = new Error("STRIPE_WEBHOOK_SECRET is not configured");
    err.statusCode = 503;
    throw err;
  }
  return getStripe().webhooks.constructEvent(
    rawBody,
    signature,
    cfg.webhookSecret,
  );
}

export default { getStripe, constructWebhookEvent };
