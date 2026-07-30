import { Card, PageHeader } from "@/components/ui/Card";

const TERMS_SECTIONS = [
  {
    title: "1. Acceptance of Terms",
    body: "By accessing or using myTask, you agree to these Terms & Conditions. If you do not agree, do not use the service.",
  },
  {
    title: "2. Accounts",
    body: "You are responsible for maintaining the confidentiality of your credentials and for all activity under your account. Notify your organisation owner promptly of any unauthorised access.",
  },
  {
    title: "3. Organisations and data",
    body: "Organisation owners control membership, roles, and operational data (employees, timesheets, reports, payouts). You agree to use organisation data only for legitimate work purposes authorised by that organisation.",
  },
  {
    title: "4. Acceptable use",
    body: "You must not misuse the service, attempt to bypass access controls, interfere with other users, or upload unlawful content. We may suspend access for policy violations.",
  },
  {
    title: "5. Availability",
    body: "We aim for reliable availability but do not guarantee uninterrupted service. Features may evolve; material changes will be communicated through the product where practical.",
  },
  {
    title: "6. Liability",
    body: "To the maximum extent permitted by law, myTask is provided as-is. Organisation owners remain responsible for payroll decisions, approvals, and statutory compliance.",
  },
  {
    title: "7. Changes",
    body: "These terms may be updated. Continued use after updates constitutes acceptance of the revised terms. Content may later be managed via API/CMS without changing this page layout.",
  },
  {
    title: "8. Contact",
    body: "Questions about these terms should be directed to your organisation owner or product support channel.",
  },
];

export function TermsContent() {
  return (
    <div className="mt-fade-in flex flex-col gap-4">
      <PageHeader
        title="Terms & Conditions"
        description="The agreement that governs use of myTask."
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
    body: "Account profile details, organisation membership, timesheet activity, notifications, and device tokens used for push delivery.",
  },
  {
    title: "How we use information",
    body: "To authenticate users, operate organisations, deliver notifications, generate reports, and improve product reliability and security.",
  },
  {
    title: "Sharing",
    body: "Organisation data is visible to authorised members according to role permissions. Service providers (for example hosting, email, or push) process data only to provide the service.",
  },
  {
    title: "Retention",
    body: "Data is retained while your account or organisation remains active, and as required for operational or legal obligations.",
  },
  {
    title: "Your choices",
    body: "You may update profile information, revoke browser notification permission, and request account closure through your organisation owner or support.",
  },
];

export function PrivacyContent() {
  return (
    <div className="mt-fade-in flex flex-col gap-4">
      <PageHeader
        title="Privacy Policy"
        description="How myTask handles personal and organisation data."
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
