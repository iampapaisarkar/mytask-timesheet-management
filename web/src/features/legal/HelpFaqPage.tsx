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
        a: "After signing in, open Create organisation from the organisation switcher or home screen. Complete the setup (holiday and payroll calendars) before inviting employees or creating timesheets.",
      },
      {
        q: "How do I switch organisations?",
        a: "Use the organisation dropdown in the top header. Select another organisation, or choose Back to myTask to return to your personal workspace.",
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
        a: "Open Profile from the header or sidebar and update your details. Changes sync for the signed-in account.",
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
        a: "Owners and managers invite employees by email. Invitees receive an email and in-app notification with a link to accept the invitation.",
      },
    ],
  },
  {
    title: "Tasks",
    items: [
      {
        q: "What are jobs and customers?",
        a: "Customers and jobs define where work happens. Timesheet day entries can be linked to jobs selected for that timesheet period.",
      },
    ],
  },
  {
    title: "Timesheets",
    items: [
      {
        q: "How do I submit a timesheet?",
        a: "Open My Sheets, complete day entries, then submit for approval. Managers review items under Timesheets (management).",
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
        a: "Approved timesheets become eligible for payout. Create a payout from the Payouts page, then mark it paid when complete.",
      },
    ],
  },
  {
    title: "Reports",
    items: [
      {
        q: "How do I generate a report?",
        a: "Open Reports, select one employee and an approved timesheet, then generate. Download PDF or email the report when ready.",
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
        a: "Each notification includes a destination (timesheet, report, invitation, etc.). Clicking the bell item or push toast navigates to that screen.",
      },
    ],
  },
  {
    title: "Permissions",
    items: [
      {
        q: "Why is a menu item missing?",
        a: "Navigation and actions are gated by your organisation role ACL. Contact an owner if you need additional permissions.",
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
    ],
  },
  {
    title: "Contact Support",
    items: [
      {
        q: "How do I get help?",
        a: "Contact your organisation owner first. For product issues, email support with your account email, organisation code, and a short description of the problem.",
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
        description="Answers for account, organisations, timesheets, payroll, and notifications."
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
