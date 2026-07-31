import { Card, PageHeader } from "@/components/ui/Card";

const TERMS_SECTIONS = [
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

export function TermsContent() {
  return (
    <div className="mt-fade-in flex flex-col gap-4">
      <PageHeader
        title="Terms & Conditions"
        description="The agreement that governs use of myTask, including plans and payments."
      />
      <Card className="flex flex-col gap-5">
        {TERMS_SECTIONS.map((section) => (
          <section key={section.title}>
            <h2 className="text-sm font-semibold text-[var(--mt-text)]">
              {section.title}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              {section.body}
            </p>
          </section>
        ))}
      </Card>
    </div>
  );
}

export function TermsPage() {
  return <TermsContent />;
}

const PRIVACY_SECTIONS = [
  {
    title: "Information we process",
    body: "Account profile details (name, email, phone), organisation membership and roles, timesheet and payroll-related activity, notifications, device tokens for push delivery, subscription status, plan usage counters, and billing records (invoice numbers, amounts, payment status, Stripe customer/subscription identifiers).",
  },
  {
    title: "Payments and Stripe",
    body: "Card payments are processed by Stripe. We do not store full card numbers on myTask servers. Stripe may process payment method details, billing address, and transaction metadata under its own privacy policy. We store references needed to sync your plan, show billing history, send receipts, and support cancellations or disputes.",
  },
  {
    title: "How we use information",
    body: "To authenticate users, operate organisations, enforce plan limits, process subscriptions, deliver in-app and email notifications (including billing and expiry notices), generate reports, and improve product reliability and security.",
  },
  {
    title: "Sharing",
    body: "Organisation data is visible to authorised members according to role permissions. Service providers (hosting, email, push, and Stripe for payments) process data only to provide the service. We do not sell personal information.",
  },
  {
    title: "Retention",
    body: "Account and organisation data is retained while your account or organisation remains active. Billing and subscription history may be retained as required for accounting, fraud prevention, and legal obligations. You may request account closure through support.",
  },
  {
    title: "Your choices",
    body: "You may update profile information, manage or cancel your subscription via Subscription / Stripe Customer Portal, download invoices from Billing history, revoke browser notification permission, and request account closure through your organisation owner or support.",
  },
  {
    title: "Contact",
    body: "Privacy questions can be sent to product support with your account email. For payment-processor requests that only Stripe can fulfil, we will point you to Stripe’s customer tools where appropriate.",
  },
];

export function PrivacyContent() {
  return (
    <div className="mt-fade-in flex flex-col gap-4">
      <PageHeader
        title="Privacy Policy"
        description="How myTask handles personal, organisation, and billing data."
      />
      <Card className="flex flex-col gap-5">
        {PRIVACY_SECTIONS.map((section) => (
          <section key={section.title}>
            <h2 className="text-sm font-semibold text-[var(--mt-text)]">
              {section.title}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              {section.body}
            </p>
          </section>
        ))}
      </Card>
    </div>
  );
}

export function PrivacyPage() {
  return <PrivacyContent />;
}
