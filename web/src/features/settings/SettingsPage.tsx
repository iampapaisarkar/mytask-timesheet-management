import { Link, useParams } from "react-router-dom";
import { Card, PageHeader } from "@/components/ui/Card";
import { ChevronRight } from "lucide-react";

const SETTINGS_LINKS = [
  { label: "Organisation details", path: "organisation-details" as const },
  { label: "Holiday Calendar", path: "holiday-calendars" as const },
  { label: "Payroll Calendar", path: "payroll-calendars" as const },
];

export function SettingsPage() {
  const { orgCode = "" } = useParams();

  return (
    <div className="mt-fade-in flex flex-col gap-4">
      <PageHeader
        title="Settings"
        description="Organisation configuration"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {SETTINGS_LINKS.map((item) => (
          <Link
            key={item.path}
            to={`/org/${orgCode}/settings/${item.path}`}
            className="group"
          >
            <Card hover className="flex items-center justify-between gap-3">
              <span className="font-semibold text-[var(--mt-text)]">
                {item.label}
              </span>
              <ChevronRight
                size={18}
                className="text-muted transition group-hover:text-primary"
              />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <Card className="mt-fade-in">
      <h1 className="text-2xl font-bold tracking-tight text-[var(--mt-text)]">
        {title}
      </h1>
      <p className="mt-2 text-sm text-muted">
        Screen scaffolded. Detailed forms and API wiring continue in the next
        migration milestone.
      </p>
    </Card>
  );
}
