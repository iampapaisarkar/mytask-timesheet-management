import { useParams, Link } from "react-router-dom";
import { ROUTES } from "@mysheet/constants";
import { useOrganisationStore } from "@/store/organisationStore";

export function OrganisationHomePage() {
  const { orgCode = "" } = useParams();
  const organisation = useOrganisationStore((s) => s.organisation);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {organisation?.name || "Organisation"} Home
        </h1>
        <p className="text-sm text-muted">Quick links</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: "My Timesheets", to: ROUTES.timesheet(orgCode) },
          { label: "Timesheets", to: ROUTES.timesheetManagement(orgCode) },
          { label: "Employees", to: ROUTES.employees(orgCode) },
          { label: "Customers", to: ROUTES.customers(orgCode) },
          { label: "Jobs", to: ROUTES.jobs(orgCode) },
          { label: "Settings", to: ROUTES.settings(orgCode) },
          { label: "Reports", to: ROUTES.reports(orgCode) },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="rounded-lg border border-border bg-white p-5 hover:border-primary"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
