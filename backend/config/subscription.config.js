/**
 * Subscription plan feature keys and default Free/Pro limits.
 * DB plan_features is source of truth; these are fallbacks.
 */
export const PLAN_CODES = Object.freeze({
  FREE: "free",
  PRO: "pro",
});

export const FEATURE_KEYS = Object.freeze({
  ORGANISATIONS: "organisations",
  EMPLOYEES_PER_ORG: "employees_per_org",
  CUSTOMERS: "customers",
  JOBS_PER_CUSTOMER: "jobs_per_customer",
  TIMESHEETS_PER_EMPLOYEE_MONTH: "timesheets_per_employee_month",
  REPORTS_PER_DAY: "reports_per_day",
  EMAIL_NOTIFICATIONS: "email_notifications",
  SYSTEM_LOGS: "system_logs",
});

export const BILLING_INTERVALS = Object.freeze({
  MONTH: "month",
  YEAR: "year",
  NONE: "none",
});

export const ACTIVE_SUBSCRIPTION_STATUSES = Object.freeze([
  "active",
  "trialing",
  "past_due",
]);

export const SUBSCRIPTION_NOTIFICATION_TYPES = Object.freeze({
  EXPIRY_7_DAYS: "expiry_reminder_7_days",
  EXPIRY_3_DAYS: "expiry_reminder_3_days",
  EXPIRY_1_DAY: "expiry_reminder_1_day",
  EXPIRED: "subscription_expired",
  PAYMENT_FAILED: "payment_failed",
  PAYMENT_SUCCEEDED: "payment_succeeded",
  PLAN_UPGRADED: "plan_upgraded",
  PLAN_RENEWED: "plan_renewed",
  PLAN_CANCELLED: "plan_cancelled",
});

export function getStripeConfig() {
  return {
    secretKey: process.env.STRIPE_SECRET_KEY || "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
    priceProMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY || "",
    priceProYearly: process.env.STRIPE_PRICE_PRO_YEARLY || "",
    productPro: process.env.STRIPE_PRODUCT_PRO || "",
    successUrl:
      process.env.STRIPE_CHECKOUT_SUCCESS_URL ||
      `${process.env.CLIENT_URL || "http://localhost:9000"}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl:
      process.env.STRIPE_CHECKOUT_CANCEL_URL ||
      `${process.env.CLIENT_URL || "http://localhost:9000"}/pricing?checkout=cancelled`,
    portalReturnUrl:
      process.env.STRIPE_PORTAL_RETURN_URL ||
      `${process.env.CLIENT_URL || "http://localhost:9000"}/subscription`,
  };
}

export function assertStripeConfigured() {
  const cfg = getStripeConfig();
  if (!cfg.secretKey) {
    const err = new Error(
      "Stripe is not configured. Set STRIPE_SECRET_KEY in the environment.",
    );
    err.statusCode = 503;
    err.code = "STRIPE_NOT_CONFIGURED";
    throw err;
  }
  return cfg;
}
