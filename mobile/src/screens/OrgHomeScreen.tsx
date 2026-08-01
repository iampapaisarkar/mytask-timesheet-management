import { useMemo, type ReactNode } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { formatMoney } from "@mytask/constants";
import { useDashboardParallel } from "@mytask/hooks";
import { can, getOrganisationAcl } from "@mytask/services";
import { radii, spacing, typography } from "@mytask/theme";
import { getOrganisationRoleCode } from "@mytask/utils";
import { ClockInOut } from "../components/ClockInOut";
import { SkeletonBlock, SkeletonDashboard } from "../components/Skeleton";
import type { DashboardStackParamList } from "../navigation/types";
import { useOrgTabBarScrollInset } from "../navigation/useOrgTabBarScrollInset";
import { useOrganisationStore } from "../store/organisationStore";
import { useThemeStore } from "../store/themeStore";
import {
  AlertIcon,
  Card,
  ChartIcon,
  CheckCircleIcon,
  ClockIcon,
  EmptyState,
  ErrorState,
  SectionHeader,
  StatCard,
  UsersIcon,
  WalletIcon,
  elevation,
} from "../ui";
import { triggerHaptic } from "../utils/haptics";

type Props = NativeStackScreenProps<DashboardStackParamList, "OrgDashboard">;

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

function roleDescription(role?: string | null, source?: string): string {
  if (role === "staff") return "Your hours, timesheets, and payout history";
  if (role === "manager") {
    return "Assigned team timesheets, approvals, and payroll";
  }
  if (role === "moderator" || role === "owner") {
    return "Organisation-wide timesheet and payroll overview";
  }
  return source === "management"
    ? "Management overview of tasks and payroll"
    : "Overview of your timesheets and activity";
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <Card style={styles.chartCard}>
      <SectionHeader title={title} subtitle={subtitle} />
      {children}
    </Card>
  );
}

export function OrgHomeScreen({ route }: Props) {
  const organisation = useOrganisationStore((s) => s.organisation);
  const { orgCode } = route.params;
  const c = useThemeStore((s) => s.colors);
  const tabScrollInset = useOrgTabBarScrollInset();
  const acl = getOrganisationAcl(organisation?.role || organisation?.role_code);
  const roleCode = getOrganisationRoleCode(organisation || {});
  const canPayout = can(acl, "payout", "list");

  const dashboard = useDashboardParallel(orgCode, Boolean(orgCode));
  const overview = dashboard.overview;
  const kpis = overview?.kpis;
  const displayCurrency = overview?.display_currency || null;
  const isStaff = (overview?.role || roleCode) === "staff";
  const isManager = (overview?.role || roleCode) === "manager";

  const weekly = overview?.weekly_progress ?? [];
  const statusDonut = overview?.status_donut ?? [];
  const recent = overview?.recent_activity ?? [];
  const trend = useMemo(() => {
    if (canPayout && (overview?.payroll_trend?.length || 0) > 0) {
      return {
        title: "Payroll trend",
        subtitle: "Last 6 months",
        rows: overview?.payroll_trend || [],
        money: true,
      };
    }
    return {
      title: "Productivity trend",
      subtitle: "Approved hours · last 6 months",
      rows: overview?.productivity_trend || [],
      money: false,
    };
  }, [canPayout, overview?.payroll_trend, overview?.productivity_trend]);

  const primaryStats = useMemo(() => {
    if (!kpis) return [];
    const {
      approved = 0,
      draft = 0,
      submitted = 0,
      total = 0,
      approval_rate_pct = 0,
      employees = 0,
      worked_hours_month = 0,
      approved_hours_month = 0,
      pending_hours_month = 0,
      payroll_this_month = 0,
      pending_payout_amount = 0,
      pending_payouts = 0,
      paid_payouts = 0,
    } = kpis;
    const pending = draft + submitted;

    if (isStaff) {
      return [
        {
          label: "Worked hours",
          value: `${worked_hours_month}h`,
          hint: "This calendar month",
          icon: <ClockIcon color={c.primary} size={16} />,
          accent: c.primary,
        },
        {
          label: "Approved hours",
          value: `${approved_hours_month}h`,
          hint: `${pending_hours_month}h pending`,
          icon: <CheckCircleIcon color={c.positive} size={16} />,
          accent: c.positive,
        },
        {
          label: "Latest payout",
          value: overview?.latest_payout
            ? formatMoney(
                overview.latest_payout.net_amount ??
                  overview.latest_payout.amount,
                overview.latest_payout.currency || displayCurrency,
              )
            : "—",
          hint:
            overview?.latest_payout?.status ||
            (canPayout ? "No payout yet" : "Payouts unavailable"),
          icon: <WalletIcon color={c.info} size={16} />,
          accent: c.info,
        },
        {
          label: "Paid this month",
          value: formatMoney(payroll_this_month, displayCurrency),
          hint: `${paid_payouts} paid · ${pending_payouts} pending`,
          icon: <ChartIcon color={c.secondary} size={16} />,
          accent: c.secondary,
        },
      ];
    }

    return [
      {
        label: isManager ? "Assigned employees" : "Employees",
        value: String(employees),
        hint:
          overview?.source === "management"
            ? "In your management scope"
            : "In view",
        icon: <UsersIcon color={c.primary} size={16} />,
        accent: c.primary,
      },
      {
        label: "Approved",
        value: String(approved),
        hint: total
          ? `${total} total · ${approval_rate_pct}% rate`
          : "No timesheets yet",
        icon: <CheckCircleIcon color={c.positive} size={16} />,
        accent: c.positive,
      },
      {
        label: "Pending",
        value: String(pending),
        hint: "Draft or submitted",
        icon: <AlertIcon color={c.warning} size={16} />,
        accent: c.warning,
      },
      {
        label: "Payroll this month",
        value: formatMoney(payroll_this_month, displayCurrency),
        hint: canPayout
          ? `${formatMoney(pending_payout_amount, displayCurrency)} pending`
          : "Payout access required",
        icon: <WalletIcon color={c.info} size={16} />,
        accent: c.info,
      },
    ];
  }, [kpis, isStaff, isManager, overview, displayCurrency, canPayout, c]);

  const payoutStats =
    canPayout && !isStaff && kpis
      ? [
          {
            label: "Pending payouts",
            value: String(kpis.pending_payouts ?? 0),
            hint: formatMoney(kpis.pending_payout_amount, displayCurrency),
            accent: c.warning,
          },
          {
            label: "Paid payouts",
            value: String(kpis.paid_payouts ?? 0),
            hint: "All-time in scope",
            accent: c.positive,
          },
          {
            label: "Hours this month",
            value: `${kpis.worked_hours_month ?? 0}h`,
            hint: `${kpis.approved_hours_month ?? 0}h approved`,
            accent: c.primary,
          },
        ]
      : [];

  const maxWeekly = Math.max(
    1,
    ...weekly.map((d) => d.completed + d.pending),
  );
  const statusTotal = Math.max(
    1,
    statusDonut.reduce((sum, row) => sum + row.count, 0),
  );
  const maxTrend = Math.max(1, ...trend.rows.map((r) => Number(r.value) || 0));

  const weeklyRows =
    weekly.length > 0
      ? weekly
      : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => ({
          day,
          completed: 0,
          pending: 0,
        }));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={[
        styles.container,
        { paddingBottom: tabScrollInset },
      ]}
      showsHorizontalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={dashboard.isFetching && !dashboard.isLoading}
          onRefresh={() => {
            void triggerHaptic("light");
            void dashboard.refetch();
          }}
          tintColor={c.primary}
        />
      }
    >
      <Text style={[styles.roleLine, { color: c.muted }]}>
        {roleDescription(overview?.role || roleCode, overview?.source)}
      </Text>

      <ClockInOut />

      {dashboard.summaryQuery.isLoading && !kpis ? (
        <SkeletonDashboard />
      ) : dashboard.isError && !overview ? (
        <ErrorState
          title="Unable to load dashboard"
          description="Pull to refresh or try again in a moment."
          onRetry={() => void dashboard.refetch()}
        />
      ) : (
        <>
          <SectionHeader title="Overview" subtitle="Key metrics this month" />
          <View style={styles.grid}>
            {primaryStats.map((stat) => (
              <StatCard key={stat.label} {...stat} />
            ))}
          </View>

          {payoutStats.length > 0 ? (
            <View style={[styles.grid, { marginTop: 10 }]}>
              {payoutStats.map((stat) => (
                <StatCard key={stat.label} {...stat} />
              ))}
            </View>
          ) : null}

          <ChartCard
            title="Weekly progress"
            subtitle="Completed vs pending"
          >
            {dashboard.graphsQuery.isLoading && weekly.length === 0 ? (
              <View style={styles.bars}>
                {Array.from({ length: 7 }).map((_, i) => (
                  <SkeletonBlock
                    key={i}
                    height={40 + (i % 3) * 18}
                    width={18}
                    radius={8}
                  />
                ))}
              </View>
            ) : (
              <>
                <View style={styles.bars}>
                  {weeklyRows.map((row) => {
                    const total = row.completed + row.pending;
                    const stackH = Math.max(
                      8,
                      Math.round((total / maxWeekly) * 110),
                    );
                    const completedH =
                      total === 0
                        ? 0
                        : Math.round((row.completed / total) * stackH);
                    const pendingH = Math.max(0, stackH - completedH);
                    return (
                      <View key={row.day} style={styles.barCol}>
                        <View style={[styles.stack, { height: stackH }]}>
                          {pendingH > 0 ? (
                            <View
                              style={{
                                height: pendingH,
                                width: 18,
                                backgroundColor: c.warningSoft,
                                borderTopLeftRadius: completedH > 0 ? 0 : 8,
                                borderTopRightRadius: completedH > 0 ? 0 : 8,
                              }}
                            />
                          ) : null}
                          {completedH > 0 ? (
                            <View
                              style={{
                                height: completedH,
                                width: 18,
                                backgroundColor: c.primary,
                                borderTopLeftRadius: 8,
                                borderTopRightRadius: 8,
                                borderBottomLeftRadius: pendingH > 0 ? 0 : 8,
                                borderBottomRightRadius: pendingH > 0 ? 0 : 8,
                              }}
                            />
                          ) : null}
                        </View>
                        <Text style={[styles.barLabel, { color: c.muted }]}>
                          {row.day[0]}
                        </Text>
                      </View>
                    );
                  })}
                </View>
                <View style={styles.legendRow}>
                  <View style={styles.legendItem}>
                    <View
                      style={[styles.legendDot, { backgroundColor: c.primary }]}
                    />
                    <Text style={{ color: c.muted, fontSize: 11 }}>
                      Completed
                    </Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View
                      style={[
                        styles.legendDot,
                        { backgroundColor: c.warningSoft },
                      ]}
                    />
                    <Text style={{ color: c.muted, fontSize: 11 }}>
                      Pending
                    </Text>
                  </View>
                </View>
              </>
            )}
          </ChartCard>

          <ChartCard
            title="Timesheet status"
            subtitle="Current breakdown"
          >
            {dashboard.graphsQuery.isLoading && statusDonut.length === 0 ? (
              <SkeletonBlock height={72} radius={12} />
            ) : statusDonut.length === 0 ? (
              <EmptyState
                title="No timesheet data yet"
                description="Status breakdown will appear once timesheets are created."
              />
            ) : (
              <>
                <View style={styles.statusTrack}>
                  {statusDonut.map((row) => {
                    const flex = Math.max(row.count / statusTotal, 0.04);
                    return (
                      <View
                        key={row.code}
                        style={{
                          flex,
                          height: 12,
                          backgroundColor:
                            STATUS_COLORS[row.code] || c.primary,
                        }}
                      />
                    );
                  })}
                </View>
                <View style={styles.statusList}>
                  {statusDonut.map((row) => (
                    <View key={row.code} style={styles.statusRow}>
                      <View
                        style={[
                          styles.legendDot,
                          {
                            backgroundColor:
                              STATUS_COLORS[row.code] || c.primary,
                          },
                        ]}
                      />
                      <Text
                        style={[styles.statusName, { color: c.text }]}
                        numberOfLines={1}
                      >
                        {row.name}
                      </Text>
                      <Text style={{ color: c.muted, fontWeight: "700" }}>
                        {row.count}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </ChartCard>

          <ChartCard title={trend.title} subtitle={trend.subtitle}>
            {dashboard.graphsQuery.isLoading && trend.rows.length === 0 ? (
              <View style={styles.trendBars}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonBlock
                    key={i}
                    height={36 + (i % 3) * 16}
                    width={22}
                    radius={8}
                  />
                ))}
              </View>
            ) : trend.rows.length === 0 ? (
              <EmptyState
                title="No trend data yet"
                description="Trends appear after enough approved activity."
              />
            ) : (
              <View style={styles.trendBars}>
                {trend.rows.map((row) => {
                  const value = Number(row.value) || 0;
                  const h = Math.max(8, Math.round((value / maxTrend) * 100));
                  return (
                    <View key={row.label} style={styles.trendCol}>
                      <Text
                        style={[styles.trendValue, { color: c.muted }]}
                        numberOfLines={1}
                      >
                        {trend.money
                          ? formatMoney(value, displayCurrency)
                          : `${value}h`}
                      </Text>
                      <View
                        style={[
                          styles.trendBar,
                          elevation.soft,
                          { height: h, backgroundColor: c.primary },
                        ]}
                      />
                      <Text style={[styles.barLabel, { color: c.muted }]}>
                        {row.label.slice(0, 3)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </ChartCard>

          <ChartCard
            title="Recent activity"
            subtitle="Latest notifications in this organisation"
          >
            {dashboard.recentQuery.isLoading && recent.length === 0 ? (
              <View style={{ gap: 10 }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonBlock key={i} height={44} radius={10} />
                ))}
              </View>
            ) : recent.length === 0 ? (
              <EmptyState
                title="No recent activity"
                description="Notifications and updates will show up here."
              />
            ) : (
              recent.slice(0, 8).map((item, index) => (
                <View
                  key={`${item.title}-${index}`}
                  style={[
                    styles.activityRow,
                    index < Math.min(recent.length, 8) - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: c.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.activityDot,
                      { backgroundColor: c.primarySoft },
                    ]}
                  >
                    <View
                      style={[
                        styles.activityDotInner,
                        { backgroundColor: c.primary },
                      ]}
                    />
                  </View>
                  <View style={styles.activityText}>
                    <Text
                      style={[styles.activityTitle, { color: c.text }]}
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>
                    <Text
                      style={[styles.activityMeta, { color: c.muted }]}
                      numberOfLines={1}
                    >
                      {[item.meta, item.at].filter(Boolean).join(" · ")}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </ChartCard>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  roleLine: {
    fontSize: typography.sizes.sm,
    fontWeight: "500",
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 4 },
  chartCard: {
    marginTop: spacing.md,
  },
  bars: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 130,
  },
  barCol: { alignItems: "center", flex: 1 },
  stack: {
    width: 18,
    justifyContent: "flex-end",
    borderRadius: 8,
    overflow: "hidden",
  },
  barLabel: { fontSize: 10, marginTop: 6, fontWeight: "600" },
  legendRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: spacing.sm,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  statusTrack: {
    flexDirection: "row",
    height: 12,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: spacing.sm,
  },
  statusList: { gap: 8 },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusName: { flex: 1, fontSize: 13, fontWeight: "500", minWidth: 0 },
  trendBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    minHeight: 140,
    gap: 4,
  },
  trendCol: { flex: 1, alignItems: "center", minWidth: 0 },
  trendValue: { fontSize: 9, marginBottom: 4, fontWeight: "600" },
  trendBar: { width: 22, borderRadius: radii.sm, marginBottom: 4 },
  activityRow: {
    paddingVertical: 12,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  activityDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  activityDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activityText: { flex: 1, minWidth: 0 },
  activityTitle: { fontSize: typography.sizes.sm, fontWeight: "600" },
  activityMeta: { fontSize: typography.sizes.xs, marginTop: 3 },
});
