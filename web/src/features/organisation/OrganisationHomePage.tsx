import { lazy, Suspense, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { ROUTES, formatHours, formatMoney } from "@mytask/constants";
import { can, getOrganisationAcl } from "@mytask/services";
import { useDashboardParallel } from "@mytask/hooks";
import type { DashboardOverviewView } from "@mytask/types";
import { useOrganisationStore } from "@/store/organisationStore";
import { Card, PageHeader } from "@/components/ui/Card";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { getErrorMessage, getOrganisationRoleCode } from "@mytask/utils";
import { preloadOrgNavKey } from "@/app/routeModules";
import {
  Activity,
  Banknote,
  CheckCircle2,
  Clock3,
  Hourglass,
  Smartphone,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

const OrganisationDashboardCharts = lazy(() =>
  import("./OrganisationDashboardCharts").then((m) => ({
    default: m.OrganisationDashboardCharts,
  })),
);

const STATUS_COLORS: Record<string, string> = {
  draft: "#94A3B8",
  submitted: "#F59E0B",
  approved: "#04B6B1",
  rejected: "#EF4444",
  pending_approval: "#F59E0B",
  ready: "#0F766E",
  paid: "#10B981",
  cancelled: "#EF4444",
};

function ChartTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-3">
      <h3 className="text-sm font-semibold text-[var(--mt-text)]">{title}</h3>
      {subtitle ? (
        <p className="text-xs text-muted">{subtitle}</p>
      ) : null}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card className="flex items-start gap-3">
      <div className="rounded-xl bg-primary-muted p-2.5">{icon}</div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          {label}
        </p>
        <p className="mt-1 text-2xl font-semibold text-[var(--mt-text)]">
          {value}
        </p>
        <p className="mt-0.5 text-xs text-muted">{hint}</p>
      </div>
    </Card>
  );
}

function emptyDashboard(): DashboardOverviewView {
  return {
    display_currency: null,
    kpis: {
      approved: 0,
      draft: 0,
      submitted: 0,
      rejected: 0,
      total: 0,
      approval_rate_pct: 0,
      employees: 0,
      worked_hours_month: 0,
      approved_hours_month: 0,
      pending_hours_month: 0,
      payroll_this_month: 0,
      pending_payout_amount: 0,
      pending_payouts: 0,
      paid_payouts: 0,
    },
    status_donut: [],
    weekly_progress: [],
    monthly_progress: [],
    productivity_trend: [],
    payroll_trend: [],
    payout_status_donut: [],
    team_activity: [],
    recent_activity: [],
    latest_payout: null,
    quick_links_hint: {
      has_pending_approvals: false,
      open_timesheet_id: null,
    },
  };
}

function roleDescription(role?: string | null, source?: string): string {
  if (role === "staff") {
    return "Your hours, timesheets, and payout history";
  }
  if (role === "manager") {
    return "Assigned team timesheets, approvals, and payroll summary";
  }
  if (role === "moderator" || role === "owner") {
    return "Organisation-wide timesheet and payroll overview";
  }
  return source === "management"
    ? "Management overview of tasks, progress, and payroll"
    : "Overview of your timesheets and activity";
}

function preloadQuickLink(to: string): void {
  if (to.includes("/timesheet-management")) {
    preloadOrgNavKey("timesheetManagement");
  } else if (to.includes("/timesheet")) {
    preloadOrgNavKey("timesheet");
  } else if (to.includes("/payouts")) {
    preloadOrgNavKey("payouts");
  } else if (to.includes("/employees")) {
    preloadOrgNavKey("employees");
  } else if (to.includes("/reports")) {
    preloadOrgNavKey("reports");
  } else if (to.includes("/customers")) {
    preloadOrgNavKey("customers");
  } else if (to.includes("/jobs")) {
    preloadOrgNavKey("jobs");
  } else if (to.includes("/settings")) {
    preloadOrgNavKey("settings");
  }
}

export function OrganisationHomePage() {
  const { orgCode = "" } = useParams();
  const organisation = useOrganisationStore((s) => s.organisation);
  const acl = getOrganisationAcl(organisation?.role || organisation?.role_code);
  const roleCode = getOrganisationRoleCode(organisation || {});

  const canManage = can(acl, "timesheetManagement", "list");
  const canSelf = can(acl, "timesheet", "list");
  const canPayout = can(acl, "payout", "list");
  const canViewDashboard = canManage || canSelf;

  const dashboard = useDashboardParallel(orgCode, canViewDashboard);
  const overview = dashboard.overview || emptyDashboard();
  const displayCurrency = overview.display_currency || null;
  const isStaff = (overview.role || roleCode) === "staff";
  const isManager = (overview.role || roleCode) === "manager";

  const statusDonut = useMemo(
    () =>
      overview.status_donut.map((row) => ({
        name: row.name,
        value: row.count,
        color: STATUS_COLORS[row.code] || "#64748B",
      })),
    [overview.status_donut],
  );

  const payoutDonut = useMemo(
    () =>
      (overview.payout_status_donut || [])
        .filter((row) => row.count > 0)
        .map((row) => ({
          name: row.name,
          value: row.count,
          color: STATUS_COLORS[row.code] || "#64748B",
        })),
    [overview.payout_status_donut],
  );

  const monthlyChart = useMemo(
    () =>
      overview.monthly_progress.map((row) => ({
        week: row.week,
        progress: row.progress_pct,
      })),
    [overview.monthly_progress],
  );

  const {
    approved,
    draft,
    submitted,
    total,
    approval_rate_pct,
    employees = 0,
    worked_hours_month = 0,
    approved_hours_month = 0,
    pending_hours_month = 0,
    payroll_this_month = 0,
    pending_payout_amount = 0,
    pending_payouts = 0,
    paid_payouts = 0,
  } = overview.kpis;
  const pending = draft + submitted;

  const quickLinks = [
    {
      label: "My Timesheets",
      to: ROUTES.timesheet(orgCode),
      show: can(acl, "timesheet", "list"),
    },
    {
      label: "Timesheets",
      to: ROUTES.timesheetManagement(orgCode),
      show: can(acl, "timesheetManagement", "list"),
    },
    {
      label: "Payouts",
      to: ROUTES.payouts(orgCode),
      show: canPayout,
    },
    {
      label: "Employees",
      to: ROUTES.employees(orgCode),
      show: can(acl, "employee", "list"),
    },
    {
      label: "Reports",
      to: ROUTES.reports(orgCode),
      show: can(acl, "report", "list"),
    },
    {
      label: "Customers",
      to: ROUTES.customers(orgCode),
      show: can(acl, "customer", "list"),
    },
    {
      label: "Jobs",
      to: ROUTES.jobs(orgCode),
      show: can(acl, "job", "list"),
    },
    {
      label: "Settings",
      to: ROUTES.settings(orgCode),
      show: can(acl, "setting", "list"),
    },
  ].filter((item) => item.show);

  if (canViewDashboard && dashboard.summaryQuery.isLoading && !dashboard.overview) {
    return <LoadingState label="Loading dashboard…" />;
  }

  if (canViewDashboard && dashboard.isError && !dashboard.overview) {
    return (
      <ErrorState
        message={getErrorMessage(
          dashboard.error,
          "Unable to load dashboard",
        )}
        onRetry={() => void dashboard.refetch()}
      />
    );
  }

  return (
    <div className="mt-fade-in flex flex-col gap-6">
      <PageHeader
        title={`${organisation?.name || "Organisation"} dashboard`}
        description={roleDescription(overview.role || roleCode, overview.source)}
      />

      <Card className="flex items-start gap-3 border-primary/30 bg-primary-muted/40">
        <div className="rounded-xl bg-primary-muted p-2.5">
          <Smartphone size={20} className="text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--mt-text)]">
            Clock in / out is mobile-only
          </p>
          <p className="mt-1 text-sm text-muted">
            Live tracking and background geolocation run in the myTask mobile
            app. Use the web app for timesheet review, approvals, and payroll.
          </p>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isStaff ? (
          <>
            <StatCard
              icon={<Hourglass className="text-primary" size={20} />}
              label="Worked hours"
              value={formatHours(worked_hours_month)}
              hint="This calendar month"
            />
            <StatCard
              icon={<CheckCircle2 className="text-positive" size={20} />}
              label="Approved hours"
              value={formatHours(approved_hours_month)}
              hint={`${formatHours(pending_hours_month)} pending`}
            />
            <StatCard
              icon={<Wallet className="text-info" size={20} />}
              label="Latest payout"
              value={
                overview.latest_payout
                  ? formatMoney(
                      overview.latest_payout.net_amount ??
                        overview.latest_payout.amount,
                      overview.latest_payout.currency || displayCurrency,
                    )
                  : "—"
              }
              hint={
                overview.latest_payout?.status ||
                (canPayout ? "No payout yet" : "Payouts unavailable")
              }
            />
            <StatCard
              icon={<Banknote className="text-warning" size={20} />}
              label="Paid this month"
              value={formatMoney(payroll_this_month, displayCurrency)}
              hint={`${paid_payouts} paid · ${pending_payouts} pending`}
            />
          </>
        ) : (
          <>
            <StatCard
              icon={<Users className="text-info" size={20} />}
              label={isManager ? "Assigned employees" : "Employees"}
              value={String(employees)}
              hint={
                overview.source === "management"
                  ? "In your management scope"
                  : "In view"
              }
            />
            <StatCard
              icon={<CheckCircle2 className="text-primary" size={20} />}
              label="Approved timesheets"
              value={String(approved)}
              hint={total ? `${total} total · ${approval_rate_pct}% rate` : "No timesheets yet"}
            />
            <StatCard
              icon={<Clock3 className="text-warning" size={20} />}
              label="Pending timesheets"
              value={String(pending)}
              hint="Draft or submitted"
            />
            <StatCard
              icon={<Banknote className="text-positive" size={20} />}
              label="Payroll this month"
              value={formatMoney(payroll_this_month, displayCurrency)}
              hint={
                canPayout
                  ? `${formatMoney(pending_payout_amount, displayCurrency)} pending · ${pending_payouts} ready`
                  : "Payout access required"
              }
            />
          </>
        )}
      </div>

      {canPayout && !isStaff ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            icon={<Wallet className="text-primary" size={20} />}
            label="Pending payouts"
            value={String(pending_payouts)}
            hint={formatMoney(pending_payout_amount, displayCurrency)}
          />
          <StatCard
            icon={<TrendingUp className="text-positive" size={20} />}
            label="Paid payouts"
            value={String(paid_payouts)}
            hint="All-time in scope"
          />
          <StatCard
            icon={<Hourglass className="text-info" size={20} />}
            label="Hours this month"
            value={formatHours(worked_hours_month)}
            hint={`${formatHours(approved_hours_month)} approved`}
          />
        </div>
      ) : null}

      <Suspense
        fallback={
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="h-72 animate-pulse bg-[var(--mt-bg)]">
              <span className="sr-only">Loading charts…</span>
            </Card>
            <Card className="h-72 animate-pulse bg-[var(--mt-bg)]">
              <span className="sr-only">Loading charts…</span>
            </Card>
          </div>
        }
      >
        <OrganisationDashboardCharts
          overview={overview}
          canPayout={canPayout}
          monthlyChart={monthlyChart}
          statusDonut={statusDonut}
          payoutDonut={payoutDonut}
        />
      </Suspense>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <ChartTitle title="Recent activity" subtitle="Latest notifications" />
          <ul className="mt-2 flex flex-col gap-3">
            {(overview.recent_activity.length
              ? overview.recent_activity
              : [
                  {
                    title: "No recent activity",
                    meta: "Check back later",
                    at: null,
                    url: null,
                  },
                ]
            ).map((item, index) => (
              <li
                key={`${item.title}-${index}`}
                className="flex items-start gap-3 rounded-xl border border-border px-3 py-2.5"
              >
                <Activity size={16} className="mt-0.5 text-primary" />
                <div>
                  <div className="text-sm font-medium text-[var(--mt-text)]">
                    {item.title}
                  </div>
                  <div className="text-xs text-muted">{item.meta}</div>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="lg:col-span-2">
          <ChartTitle title="Quick links" subtitle="Jump into common areas" />
          <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {quickLinks.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onMouseEnter={() => preloadQuickLink(item.to)}
                onFocus={() => preloadQuickLink(item.to)}
                className="mt-focus rounded-xl border border-border bg-[var(--mt-bg)] px-4 py-4 text-sm font-semibold text-[var(--mt-text)] transition hover:border-primary hover:text-primary"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
