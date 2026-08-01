/** Shared Help / Terms / Privacy copy — single source for web + mobile. */

export type FaqItem = { q: string; a: string };
export type FaqSection = { title: string; items: FaqItem[] };
export type LegalSection = { title: string; body: string };

export const FAQ_SECTIONS: FaqSection[] = [
  {
    title: "Getting Started",
    items: [
      {
        q: "How do I create an organisation?",
        a: "After signing in, open Create organisation from the organisation switcher or home screen. Your plan limits how many organisations you can own (Free: 1, Pro: 5). Complete holiday and payroll calendar setup before inviting employees or creating timesheets.",
      },
      {
        q: "How do I switch organisations?",
        a: "Use the organisation dropdown in the top header. Select another organisation, or choose Back to myTask to return to your personal workspace (subscription and billing live there).",
      },
    ],
  },
  {
    title: "Plans, Subscriptions & Billing",
    items: [
      {
        q: "What plans does myTask offer?",
        a: "Free ($0) and Pro. Pro is available monthly ($9.99 USD) or yearly ($99.99 USD). Free includes basic limits; Pro raises organisation, employee, customer, job, timesheet, and report limits, and unlocks email notifications and System Logs.",
      },
      {
        q: "Who owns the subscription?",
        a: "Subscriptions are personal to your user account — not shared with invited teammates. Workspace limits (employees, customers, jobs, timesheets, reports) follow the organisation owner's plan. Your own Pro unlocks System Logs for you.",
      },
      {
        q: "How do I upgrade to Pro?",
        a: "Open Pricing (from Login, Home, Profile, or Subscription), choose Monthly or Yearly, and complete Stripe Checkout. After payment you are redirected to a success page; your plan syncs automatically. You can also tap Sync from Stripe on the Subscription page.",
      },
      {
        q: "Where do I manage billing or download invoices?",
        a: "Go to Subscription for plan details, renewal/cancel dates, and Manage billing (Stripe Customer Portal). Billing history lists paid invoices with Download PDF and View invoice for your myTask-generated invoice. Receipt emails are sent to your account email when payments succeed.",
      },
      {
        q: "How do I cancel?",
        a: "On Subscription, choose Cancel subscription to end Pro at the current period end (you keep Pro until that date), or cancel immediately from Manage billing. After Pro ends you move to Free; your data is preserved under Free limits.",
      },
      {
        q: "What happens if payment fails or Pro expires?",
        a: "Pro features are disabled and you are moved to Free. You receive an in-app notification and email explaining the reason (for example payment failed or period ended). Update your payment method and resubscribe from Pricing to restore Pro.",
      },
      {
        q: "I hit a plan limit — what do I do?",
        a: "Free and Pro enforce caps (organisations, employees per org, customers, jobs per customer, timesheets per employee per month, reports per day). Upgrade to Pro for higher limits, or remove unused resources. The error message names which limit was reached.",
      },
    ],
  },
  {
    title: "Account",
    items: [
      {
        q: "How do I reset my password?",
        a: "Use Forgot password on the login screen. Follow the email link to set a new password.",
      },
      {
        q: "How do I update my profile?",
        a: "Open Profile from the header or sidebar and update your details. Changes sync for the signed-in account. Subscription and billing are linked to this same account email.",
      },
    ],
  },
  {
    title: "Organization",
    items: [
      {
        q: "Who can change organisation settings?",
        a: "Organisation owners (and roles with settings permissions) can edit organisation details, holiday calendars, and payroll calendars from Settings.",
      },
      {
        q: "How do invitations work?",
        a: "Owners and managers invite employees by email. Invitees receive an email and in-app notification with a link to accept. Invitees do not inherit the owner's Pro subscription; they keep their own Free or Pro plan.",
      },
    ],
  },
  {
    title: "Tasks",
    items: [
      {
        q: "What are jobs and customers?",
        a: "Customers and jobs define where work happens. Timesheet day entries can be linked to jobs selected for that timesheet period. Counts count toward the organisation owner's plan limits.",
      },
    ],
  },
  {
    title: "Timesheets",
    items: [
      {
        q: "How do I submit a timesheet?",
        a: "Open My Sheets, complete day entries, then submit for approval. Managers review items under Timesheets (management). Monthly timesheet generation counts toward the owner's plan quota.",
      },
      {
        q: "Can I approve my own timesheet?",
        a: "Moderators and managers cannot approve or reject their own timesheets. Owners retain full approval rights per organisation ACL.",
      },
    ],
  },
  {
    title: "Payroll",
    items: [
      {
        q: "Where are payroll calendars managed?",
        a: "Settings → Payroll Calendar. Organisations can have multiple calendars; existing calendars are view-only after creation.",
      },
      {
        q: "How do payouts work?",
        a: "Approved timesheets become eligible for payout. Create a payout from the Payouts page, then mark it paid when complete. Payouts are organisation payroll operations — separate from your personal myTask Pro subscription billing.",
      },
    ],
  },
  {
    title: "Reports",
    items: [
      {
        q: "How do I generate a report?",
        a: "Open Reports, select one employee and an approved timesheet, then generate. Download PDF or email the report when ready. Daily report generation is limited by the organisation owner's plan (Free: 3/day, Pro: 20/day).",
      },
    ],
  },
  {
    title: "Notifications",
    items: [
      {
        q: "Why am I not receiving browser push notifications?",
        a: "Allow notifications when prompted, keep the service worker registered, and ensure you are signed in. Foreground alerts also appear as in-app toasts.",
      },
      {
        q: "Where do notification links go?",
        a: "Each notification includes a destination (timesheet, report, invitation, subscription, etc.). Clicking the bell item or push toast navigates to that screen.",
      },
      {
        q: "Do I get emails about billing?",
        a: "Yes. Payment receipts, expiry reminders (7 / 3 / 1 days before a scheduled cancel), payment failures, and subscription ended notices are emailed to your account address. Product feature emails may require Pro.",
      },
    ],
  },
  {
    title: "Permissions",
    items: [
      {
        q: "Why is a menu item missing?",
        a: "Navigation and actions are gated by your organisation role ACL. System Logs also require Pro on your personal subscription. Contact an owner if you need additional organisation permissions, or upgrade for Pro-only features.",
      },
    ],
  },
  {
    title: "Troubleshooting",
    items: [
      {
        q: "Data looks stale after switching organisations",
        a: "Use Back to myTask, then re-open the organisation. Logout fully clears caches if a session becomes stuck.",
      },
      {
        q: "Realtime updates are not appearing",
        a: "Confirm network connectivity and that you remain signed in. The app reconnects Socket.IO automatically after brief outages.",
      },
      {
        q: "I paid but still see Free",
        a: "Open Subscription and tap Sync from Stripe, or revisit the billing success page so checkout can confirm. If the issue continues, check Billing history for your invoice and contact support with your account email and invoice number.",
      },
    ],
  },
  {
    title: "Contact Support",
    items: [
      {
        q: "How do I get help?",
        a: "Contact your organisation owner first for workspace questions. For billing or product issues, email support with your account email, organisation code (if relevant), invoice number, and a short description of the problem.",
      },
    ],
  },
];

export const TERMS_SECTIONS: LegalSection[] = [
  {
    title: "1. Acceptance of Terms",
    body: "By accessing or using myTask, you agree to these Terms & Conditions, including the subscription and payment terms below. If you do not agree, do not use the service.",
  },
  {
    title: "2. Accounts",
    body: "You are responsible for maintaining the confidentiality of your credentials and for all activity under your account. Notify your organisation owner promptly of any unauthorised access. Billing notices and invoices are sent to the email on your account.",
  },
  {
    title: "3. Organisations and data",
    body: "Organisation owners control membership, roles, and operational data (employees, timesheets, reports, payouts). You agree to use organisation data only for legitimate work purposes authorised by that organisation. Invited members do not inherit the owner's paid subscription.",
  },
  {
    title: "4. Plans and subscriptions",
    body: "myTask offers a Free plan and a paid Pro plan (monthly or yearly). Subscriptions are owned by the authenticated user account, not by an organisation. Feature and usage limits (including organisations you may own, employees, customers, jobs, timesheets, reports, email notifications, and System Logs) are enforced according to the applicable plan. Workspace quotas for an organisation follow the organisation owner's plan.",
  },
  {
    title: "5. Payments, renewals, and invoices",
    body: "Paid subscriptions are processed by Stripe. By upgrading you authorise recurring charges for the selected billing interval until cancelled. Prices are shown at checkout in the stated currency. Successful payments generate invoices available in Billing history and may be emailed as receipts. Taxes may apply where required.",
  },
  {
    title: "6. Cancellation, expiry, and payment failure",
    body: "You may cancel at period end or immediately via Subscription / Stripe Customer Portal. When a subscription ends, expires, or a renewal payment fails, Pro features are disabled and the account reverts to Free limits. Your operational data is preserved subject to Free plan limits. We may notify you in-app and by email of upcoming expiry, payment failure, or plan changes.",
  },
  {
    title: "7. Acceptable use",
    body: "You must not misuse the service, attempt to bypass plan limits or access controls, interfere with other users, or upload unlawful content. We may suspend access for policy violations or unpaid balances on paid features.",
  },
  {
    title: "8. Availability",
    body: "We aim for reliable availability but do not guarantee uninterrupted service. Features and plan limits may evolve; material changes will be communicated through the product where practical.",
  },
  {
    title: "9. Liability",
    body: "To the maximum extent permitted by law, myTask is provided as-is. Organisation owners remain responsible for payroll decisions, approvals, and statutory compliance. Billing disputes related to card charges should first be addressed via Subscription / Stripe billing portal, then support.",
  },
  {
    title: "10. Changes",
    body: "These terms may be updated. Continued use after updates constitutes acceptance of the revised terms. Pricing or plan changes for new purchases will be reflected at checkout; existing subscriptions follow Stripe and product notices.",
  },
  {
    title: "11. Contact",
    body: "Questions about these terms, billing, or your subscription should be directed to product support (include your account email and invoice number when relevant), or to your organisation owner for workspace matters.",
  },
];

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    title: "Information we process",
    body: "Account profile details (name, email, phone), organisation membership and roles, timesheet and payroll-related activity, notifications, device tokens for push delivery, subscription status, plan usage counters, and billing records (invoice numbers, amounts, payment status, Stripe customer/subscription identifiers).",
  },
  {
    title: "How we use information",
    body: "We use data to authenticate users, operate timesheets and organisation workflows, enforce plan limits, send transactional and product notifications (including billing emails), process subscriptions via Stripe, improve reliability and security, and support customer requests.",
  },
  {
    title: "Payments and Stripe",
    body: "Card payments are processed by Stripe. We do not store full card numbers on myTask servers. Stripe may process payment method details, billing address, and transaction metadata under its own privacy policy. We store references needed to sync your plan, show billing history, send receipts, and support cancellations or disputes.",
  },
  {
    title: "Location",
    body: "When clock-in tracking is enabled, location may be collected while you are actively tracking to support travel and work activity features configured by your organisation.",
  },
  {
    title: "Sharing",
    body: "Organisation admins can access workforce data within their organisation. We do not sell personal information. Service providers (such as Stripe for payments, email and hosting vendors) process data only as needed to run myTask.",
  },
  {
    title: "Retention",
    body: "We retain account and organisation data while your account is active and as required for legal, security, and billing records. You may request deletion subject to organisation ownership and compliance obligations.",
  },
  {
    title: "Your choices",
    body: "Update profile details in the app, manage push permissions on your device, and manage billing via Subscription / Stripe Customer Portal. Organisation owners control membership and operational data retention within their workspace.",
  },
  {
    title: "Contact",
    body: "Privacy questions can be sent to product support with your account email. For payment-processor requests that only Stripe can fulfil, we will point you to Stripe’s customer tools where appropriate.",
  },
];

/** Production web / universal-link host for deep linking. */
export const APP_WEB_HOST = "mytaskapp.iampapaisarkar.dev";
export const APP_WEB_ORIGIN = `https://${APP_WEB_HOST}`;
