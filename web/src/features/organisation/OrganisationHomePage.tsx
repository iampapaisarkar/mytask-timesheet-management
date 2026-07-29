import { useParams, Link } from "react-router-dom";
import { ROUTES } from "@mytask/constants";
import { can, getOrganisationAcl } from "@mytask/services";
import { useOrganisationStore } from "@/store/organisationStore";
import { Card, PageHeader } from "@/components/ui/Card";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  CheckCircle2,
  Clock3,
  TrendingUp,
  Users,
} from "lucide-react";

const WEEKLY = [
  { day: "Mon", completed: 12, pending: 4 },
  { day: "Tue", completed: 15, pending: 3 },
  { day: "Wed", completed: 9, pending: 6 },
  { day: "Thu", completed: 18, pending: 2 },
  { day: "Fri", completed: 14, pending: 5 },
  { day: "Sat", completed: 6, pending: 1 },
  { day: "Sun", completed: 4, pending: 2 },
];

const MONTHLY = [
  { week: "W1", progress: 62 },
  { week: "W2", progress: 71 },
  { week: "W3", progress: 68 },
  { week: "W4", progress: 84 },
];

const TREND = [
  { label: "Jan", value: 58 },
  { label: "Feb", value: 64 },
  { label: "Mar", value: 61 },
  { label: "Apr", value: 72 },
  { label: "May", value: 78 },
  { label: "Jun", value: 82 },
];

const COMPLETION = [
  { name: "Completed", value: 72, color: "#04B6B1" },
  { name: "Pending", value: 18, color: "#F59E0B" },
  { name: "Overdue", value: 10, color: "#EF4444" },
];

const ACTIVITY = [
  { name: "Timesheets", count: 24 },
  { name: "Approvals", count: 11 },
  { name: "Jobs", count: 8 },
  { name: "Team", count: 16 },
];

const RECENT = [
  { title: "Timesheet submitted", meta: "Alex · 12 min ago" },
  { title: "Job updated", meta: "Site A · 41 min ago" },
  { title: "Approval completed", meta: "Manager · 1h ago" },
  { title: "Employee invited", meta: "HR · 3h ago" },
];

export function OrganisationHomePage() {
  const { orgCode = "" } = useParams();
  const organisation = useOrganisationStore((s) => s.organisation);
  const acl = getOrganisationAcl(organisation?.role || organisation?.role_code);

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
      label: "Employees",
      to: ROUTES.employees(orgCode),
      show: can(acl, "employee", "list"),
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

  return (
    <div className="mt-fade-in flex flex-col gap-6">
      <PageHeader
        title={`${organisation?.name || "Organisation"} dashboard`}
        description="Overview of tasks, progress, and team activity"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<CheckCircle2 className="text-primary" size={20} />}
          label="Tasks completed"
          value="128"
          hint="+12% this week"
        />
        <StatCard
          icon={<Clock3 className="text-warning" size={20} />}
          label="Tasks pending"
          value="34"
          hint="6 due today"
        />
        <StatCard
          icon={<TrendingUp className="text-positive" size={20} />}
          label="Completion rate"
          value="72%"
          hint="On track"
        />
        <StatCard
          icon={<Users className="text-info" size={20} />}
          label="Team activity"
          value="46"
          hint="Active this week"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <ChartTitle title="Weekly progress" subtitle="Completed vs pending" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={WEEKLY}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--mt-border)" />
                <XAxis dataKey="day" tick={{ fill: "var(--mt-muted)", fontSize: 12 }} />
                <YAxis tick={{ fill: "var(--mt-muted)", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--mt-surface)",
                    border: "1px solid var(--mt-border)",
                    borderRadius: 12,
                  }}
                />
                <Bar dataKey="completed" fill="#04B6B1" radius={[6, 6, 0, 0]} />
                <Bar dataKey="pending" fill="#F59E0B" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <ChartTitle title="Productivity trend" subtitle="Last 6 months" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={TREND}>
                <defs>
                  <linearGradient id="prod" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#04B6B1" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#04B6B1" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--mt-border)" />
                <XAxis dataKey="label" tick={{ fill: "var(--mt-muted)", fontSize: 12 }} />
                <YAxis tick={{ fill: "var(--mt-muted)", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--mt-surface)",
                    border: "1px solid var(--mt-border)",
                    borderRadius: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#04B6B1"
                  fill="url(#prod)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <ChartTitle title="Monthly progress" subtitle="By week" />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MONTHLY}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--mt-border)" />
                <XAxis dataKey="week" tick={{ fill: "var(--mt-muted)", fontSize: 12 }} />
                <YAxis tick={{ fill: "var(--mt-muted)", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--mt-surface)",
                    border: "1px solid var(--mt-border)",
                    borderRadius: 12,
                  }}
                />
                <Bar dataKey="progress" fill="#0F766E" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <ChartTitle title="Completion rate" subtitle="Status mix" />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={COMPLETION}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={3}
                >
                  {COMPLETION.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--mt-surface)",
                    border: "1px solid var(--mt-border)",
                    borderRadius: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs text-muted">
            {COMPLETION.map((c) => (
              <span key={c.name} className="inline-flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: c.color }}
                />
                {c.name}
              </span>
            ))}
          </div>
        </Card>

        <Card>
          <ChartTitle title="Team activity" subtitle="This week" />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ACTIVITY} layout="vertical" margin={{ left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--mt-border)" />
                <XAxis type="number" tick={{ fill: "var(--mt-muted)", fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={80}
                  tick={{ fill: "var(--mt-muted)", fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--mt-surface)",
                    border: "1px solid var(--mt-border)",
                    borderRadius: 12,
                  }}
                />
                <Bar dataKey="count" fill="#04B6B1" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <ChartTitle title="Recent activity" subtitle="Latest updates" />
          <ul className="mt-2 flex flex-col gap-3">
            {RECENT.map((item) => (
              <li
                key={item.title}
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
    <Card hover>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-[var(--mt-text)]">
            {value}
          </p>
          <p className="mt-1 text-xs text-muted">{hint}</p>
        </div>
        <div className="rounded-xl bg-primary-muted p-2.5">{icon}</div>
      </div>
    </Card>
  );
}

function ChartTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold text-[var(--mt-text)]">{title}</h2>
      <p className="text-xs text-muted">{subtitle}</p>
    </div>
  );
}
