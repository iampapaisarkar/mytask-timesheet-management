import { Link, useParams } from "react-router-dom";
import { ROUTES } from "@mysheet/constants";

const SETTINGS_LINKS = [
  { label: "Organisation details", path: "organisation-details" as const },
  { label: "Region", path: "regions" as const },
  { label: "Holiday Calendar", path: "holiday-calendars" as const },
  { label: "Payroll Calendar", path: "payroll-calendars" as const },
  { label: "Earning Rates", path: "earning-rates" as const },
  { label: "Earning Rate Rules", path: "earning-rate-rules" as const },
];

export function SettingsPage() {
  const { orgCode = "" } = useParams();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        {SETTINGS_LINKS.map((item) => (
          <Link
            key={item.path}
            to={`/org/${orgCode}/settings/${item.path}`}
            className="rounded-lg border border-border bg-white p-5 hover:border-primary"
          >
            {item.label}
          </Link>
        ))}
        <Link
          to={ROUTES.xeroAuthenticate}
          className="rounded-lg border border-border bg-white p-5 hover:border-primary"
        >
          Xero
        </Link>
      </div>
    </div>
  );
}

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="rounded-lg border border-border bg-white p-8">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-muted">
        Screen scaffolded. Detailed forms and API wiring continue in the next
        migration milestone.
      </p>
    </div>
  );
}
