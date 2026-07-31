import type { DashboardOverviewView } from "@mytask/types";
import { Card } from "@/components/ui/Card";
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

type DonutRow = { name: string; value: number; color: string };

export function OrganisationDashboardCharts({
  overview,
  canPayout,
  monthlyChart,
  statusDonut,
  payoutDonut,
}: {
  overview: DashboardOverviewView;
  canPayout: boolean;
  monthlyChart: { week: string; progress: number }[];
  statusDonut: DonutRow[];
  payoutDonut: DonutRow[];
}) {
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <ChartTitle
            title="Weekly progress"
            subtitle="Completed vs pending days"
          />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={overview.weekly_progress}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--mt-border)"
                />
                <XAxis
                  dataKey="day"
                  tick={{ fill: "var(--mt-muted)", fontSize: 12 }}
                />
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
          <ChartTitle
            title={canPayout ? "Payroll trend" : "Productivity trend"}
            subtitle={
              canPayout
                ? "Paid amount · last 6 months"
                : "Approved timesheets · last 6 months"
            }
          />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={
                  canPayout && (overview.payroll_trend || []).length
                    ? overview.payroll_trend
                    : overview.productivity_trend
                }
              >
                <defs>
                  <linearGradient id="prod" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#04B6B1" stopOpacity={0.4} />
                    <stop
                      offset="100%"
                      stopColor="#04B6B1"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--mt-border)"
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "var(--mt-muted)", fontSize: 12 }}
                />
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
          <ChartTitle title="Monthly progress" subtitle="By week (this month)" />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChart}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--mt-border)"
                />
                <XAxis
                  dataKey="week"
                  tick={{ fill: "var(--mt-muted)", fontSize: 12 }}
                />
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
          <ChartTitle
            title="Timesheet status"
            subtitle={
              statusDonut.length
                ? "Count by status (live)"
                : "No timesheet data yet"
            }
          />
          <div className="h-56">
            {statusDonut.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDonut}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={3}
                  >
                    {statusDonut.map((entry) => (
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
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted">
                No status data to chart
              </div>
            )}
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs text-muted">
            {statusDonut.map((c) => (
              <span key={c.name} className="inline-flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: c.color }}
                />
                {c.name} ({c.value})
              </span>
            ))}
          </div>
        </Card>

        <Card>
          <ChartTitle
            title={canPayout ? "Payout status" : "Team activity"}
            subtitle={canPayout ? "Distribution (live)" : "Timesheet volume"}
          />
          <div className="h-56">
            {canPayout && payoutDonut.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={payoutDonut}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={3}
                  >
                    {payoutDonut.map((entry) => (
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
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={overview.team_activity}
                  layout="vertical"
                  margin={{ left: 16 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--mt-border)"
                  />
                  <XAxis
                    type="number"
                    tick={{ fill: "var(--mt-muted)", fontSize: 12 }}
                  />
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
            )}
          </div>
          {canPayout && payoutDonut.length ? (
            <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs text-muted">
              {payoutDonut.map((c) => (
                <span key={c.name} className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: c.color }}
                  />
                  {c.name} ({c.value})
                </span>
              ))}
            </div>
          ) : null}
        </Card>
      </div>
    </>
  );
}
