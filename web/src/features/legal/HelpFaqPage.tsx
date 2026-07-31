import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { clsx } from "clsx";
import { Card, PageHeader } from "@/components/ui/Card";

type FaqItem = { q: string; a: string };
type FaqSection = { title: string; items: FaqItem[] };

const FAQ_SECTIONS: FaqSection[] = [
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
        a: "Go to Subscription for plan details, renewal/cancel dates, and Manage billing (Stripe Customer Portal). Billing history lists paid invoices with Download PDF and View invoice links. Receipt emails are sent to your account email when payments succeed.",
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

function FaqAccordion({ section }: { section: FaqSection }) {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <Card className="flex flex-col gap-1">
      <h2 className="mb-2 text-base font-semibold text-[var(--mt-text)]">
        {section.title}
      </h2>
      {section.items.map((item) => {
        const id = `${section.title}-${item.q}`;
        const open = openId === id;
        return (
          <div key={id} className="border-t border-border first:border-t-0">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 py-3 text-left"
              aria-expanded={open}
              onClick={() => setOpenId(open ? null : id)}
            >
              <span className="text-sm font-medium text-[var(--mt-text)]">
                {item.q}
              </span>
              <ChevronDown
                size={16}
                className={clsx(
                  "shrink-0 text-muted transition",
                  open && "rotate-180",
                )}
              />
            </button>
            {open ? (
              <p className="pb-3 text-sm leading-relaxed text-muted">{item.a}</p>
            ) : null}
          </div>
        );
      })}
    </Card>
  );
}

export function HelpFaqContent() {
  return (
    <div className="mt-fade-in flex flex-col gap-4">
      <PageHeader
        title="Help & FAQ"
        description="Account, organisations, plans & billing, timesheets, payroll, and notifications."
      />
      {FAQ_SECTIONS.map((section) => (
        <FaqAccordion key={section.title} section={section} />
      ))}
    </div>
  );
}

export function HelpFaqPage() {
  return <HelpFaqContent />;
}
