# Stripe Subscription System

Production-ready user-owned SaaS subscriptions for myTask (Free + Pro).

## Stripe Test Mode (sandbox)

| Question | Answer |
|----------|--------|
| Is Test Mode free? | **Yes.** Creating a Stripe account and using Test Mode is free. |
| Will Stripe charge my real card? | **No** in Test Mode. Use [Stripe test cards](https://docs.stripe.com/testing#cards) (e.g. `4242 4242 4242 4242`). |
| Test vs Live | **Test Mode** uses `sk_test_` / `pk_test_` keys and fake money. **Live Mode** uses `sk_live_` / `pk_live_` and charges real payment methods. Toggle in the Stripe Dashboard. |
| Test API keys | Dashboard → **Developers → API keys** (with Test mode ON) → Secret + Publishable keys. |
| Webhooks in Test Mode? | **Yes.** Use CLI (`stripe listen --forward-to …`) or a Test-mode webhook endpoint. |
| Full subscription testing without real payments? | **Yes.** Checkout, renewals (test clocks), failures, Customer Portal, and invoices all work with test keys/cards. |

## Plans

| | Free | Pro Monthly | Pro Yearly |
|--|------|-------------|------------|
| Price | $0 | $9.99 USD | $99.99 USD |
| Organisations | 1 | 5 | 5 |
| Employees / org | 3 | 10 | 10 |
| Customers | 3 | 10 | 10 |
| Jobs / customer | 5 | 20 | 20 |
| Timesheets / employee / month | 3 | 20 | 20 |
| Reports / day | 3 | 20 | 20 |
| Email notifications | No | Yes | Yes |
| System logs | No | Yes | Yes |

Subscriptions are **per authenticated user**, never inherited by invitees.

## Environment variables

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
STRIPE_PRODUCT_PRO=prod_...
CLIENT_URL=http://localhost:9000/
```

Optional URL overrides: `STRIPE_CHECKOUT_SUCCESS_URL`, `STRIPE_CHECKOUT_CANCEL_URL`, `STRIPE_PORTAL_RETURN_URL`.

## Stripe Dashboard setup (Test Mode)

1. Create Product **myTask Pro**.
2. Add recurring prices: `$9.99 / month` and `$99.99 / year` (USD).
3. Copy Price IDs into `STRIPE_PRICE_PRO_*` and Product ID into `STRIPE_PRODUCT_PRO`.
4. Enable Customer Portal (Billing → Customer portal) for payment method / invoice management.

## Local webhook testing

```bash
# Terminal A — API
cd backend && npm run watch

# Terminal B — Stripe CLI
stripe listen --forward-to localhost:8080/api/subscriptions/webhook
```

Copy the CLI `whsec_…` into `STRIPE_WEBHOOK_SECRET`.

Handled events include: `checkout.session.completed`, `customer.subscription.*`, `invoice.paid`, `invoice.payment_succeeded`, `invoice.payment_failed`, `invoice.finalized`.

## Database

```bash
cd backend && npm run migrate:all
```

Migration: `1787600000000-stripe-subscription-system.js` seeds Free/Pro plans, features, and price rows.

Backfill Free for existing users (optional one-liner via API): each user gets Free on first `GET /api/subscriptions/current` or signup.

## API surface (`/api/subscriptions`)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/plans` | optional | Catalogue + current plan |
| GET | `/comparison` | public | Feature matrix |
| GET | `/current` | required | Active subscription |
| GET | `/usage` | required | Usage snapshot |
| GET | `/feature-limits` | required | Limits map |
| GET | `/billing-history` | required | Invoices (myTask records; no Stripe PDF URLs) |
| GET | `/billing-history/:id` | required | Single invoice JSON |
| GET | `/billing-history/:id/pdf` | required | myTask-branded invoice PDF |
| GET | `/billing-history/:id/view` | required | myTask-branded HTML invoice |
| POST | `/checkout` | required | Stripe Checkout (Pro) |
| POST | `/portal` | required | Billing Portal |
| POST | `/cancel` | required | Cancel at period end / immediate |
| POST | `/webhook` | Stripe signature | Webhooks (raw body) |

## Enforcement

- Org create → acting user's plan
- Employees / customers / jobs / timesheet & report quotas → **organisation owner's** plan
- System logs → acting user's Pro flag
- Subscription emails → Pro `email_notifications` only (auth emails always allowed)

## Workers / cron

BullMQ `subscriptionQueue` + `subscription.worker.js` (started with `RUN_WORKERS=true`):

| Job | Schedule | Behaviour |
|-----|----------|-----------|
| `expiry-reminders` | Daily (boot + every 24h) | Email + in-app at **7 / 3 / 1** days before scheduled cancel; when `current_period_end` passes → **downgrade to Free** + email with reason |
| `sync-status` | Every 6h | Pull Stripe subscription status; `past_due` / `unpaid` / canceled → Free + notify |
| `subscription-notify` | On demand | In-app + email (billing lifecycle emails always send, even on Free) |
| `webhook-cleanup` | Weekly | Prune webhook logs older than 90 days |

Also under `backend/jobs/` for `npm run jobs:*`:
- `subscriptionExpiryCheck.js`
- `subscriptionStatusSync.js`
- `webhookCleanup.js`

### Expiry / payment failure → Free

| Event | Action |
|-------|--------|
| Period ended (`cancel_at_period_end`) | Downgrade to Free; email + in-app with reason |
| `invoice.payment_failed` webhook | **Immediate** Free limits; email explains payment failure |
| Stripe `past_due` / `unpaid` / `canceled` | Downgrade + reason on subscription UI |
| `customer.subscription.deleted` | Free + “subscription ended” email |

Pro features (`system_logs`, higher quotas, etc.) use **owner’s** active/trialing plan only — `past_due` no longer grants Pro.

API `GET /subscriptions/current` includes `end_reason` + `end_reason_message` for the billing UI banner.

## Confirm after Checkout (important for local)

Webhooks need `stripe listen` running. If it is not running, the success page now calls:

`POST /api/subscriptions/confirm-checkout` with `{ session_id }`

You can also force a sync anytime:

`POST /api/subscriptions/sync`

## Clients

- **Web:** `/pricing`, `/subscription`, `/billing`, `/billing/success`; Login **See Pricing**; Home **Upgrade Plan**
- **Mobile:** Pricing / Subscription / Billing History screens; Checkout via Stripe-hosted URL (`Linking.openURL`)

## Deployment checklist

1. Run migration.
2. Set Live keys only when going live (`sk_live_`, Live webhook endpoint).
3. Configure production webhook URL → `https://<api>/api/subscriptions/webhook` with Live signing secret.
4. Confirm `CLIENT_URL` / success & cancel URLs.
5. Ensure Redis + `RUN_WORKERS=true` for reminders and emails.
6. Never commit real Stripe secrets.
