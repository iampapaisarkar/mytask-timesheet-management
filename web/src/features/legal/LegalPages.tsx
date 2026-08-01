import { PRIVACY_SECTIONS, TERMS_SECTIONS } from "@mytask/constants";
import { Card, PageHeader } from "@/components/ui/Card";

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
