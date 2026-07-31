import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { spacing } from "@mytask/theme";
import { useDashboardParallel } from "@mytask/hooks";
import { can, getOrganisationAcl } from "@mytask/services";
import { ClockInOut } from "../components/ClockInOut";
import { useOrganisationStore } from "../store/organisationStore";
import { useThemeStore } from "../store/themeStore";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "OrgHome">;

type NavRoute =
  | "Timesheets"
  | "TimesheetManagementList"
  | "EmployeesList"
  | "CustomersList"
  | "JobsList"
  | "NotificationsList"
  | "SettingsHub";

export function OrgHomeScreen({ navigation, route }: Props) {
  const organisation = useOrganisationStore((s) => s.organisation);
  const { orgCode } = route.params;
  const c = useThemeStore((s) => s.colors);
  const acl = getOrganisationAcl(organisation?.role || organisation?.role_code);
  const dashboard = useDashboardParallel(orgCode, Boolean(orgCode));
  const kpis = dashboard.overview?.kpis;
  const weekly = dashboard.overview?.weekly_progress ?? [];

  const navItems: Array<{ label: string; route: NavRoute }> = [
    { label: "My Timesheets", route: "Timesheets" },
    ...(can(acl, "timesheetManagement", "list")
      ? [{ label: "Timesheet Management", route: "TimesheetManagementList" as const }]
      : []),
    ...(can(acl, "employee", "list")
      ? [{ label: "Employees", route: "EmployeesList" as const }]
      : []),
    ...(can(acl, "customer", "list")
      ? [{ label: "Customers", route: "CustomersList" as const }]
      : []),
    ...(can(acl, "job", "list")
      ? [{ label: "Jobs", route: "JobsList" as const }]
      : []),
    { label: "Notifications", route: "NotificationsList" },
    { label: "Settings", route: "SettingsHub" },
  ];

  const stats = [
    {
      label: "Approved",
      value: String(kpis?.approved ?? "—"),
      hint: `${kpis?.approval_rate_pct ?? 0}% rate`,
    },
    {
      label: "Pending",
      value: kpis
        ? String((kpis.draft ?? 0) + (kpis.submitted ?? 0))
        : "—",
      hint: `${kpis?.submitted ?? 0} submitted`,
    },
    {
      label: "Hours",
      value:
        kpis?.worked_hours_month != null
          ? `${kpis.worked_hours_month}h`
          : "—",
      hint: "This month",
    },
    {
      label: "Team",
      value: String(kpis?.employees ?? "—"),
      hint: "In scope",
    },
  ];

  const maxBar = Math.max(
    1,
    ...weekly.map((d) => d.completed + d.pending),
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={dashboard.isFetching && !dashboard.isLoading}
          onRefresh={() => void dashboard.refetch()}
          tintColor={c.primary}
        />
      }
    >
      <Text style={[styles.title, { color: c.text }]}>
        {organisation?.name || orgCode}
      </Text>
      <Text style={[styles.sub, { color: c.muted }]}>
        Organisation dashboard
      </Text>

      <ClockInOut />

      {dashboard.summaryQuery.isLoading && !kpis ? (
        <ActivityIndicator color={c.primary} style={{ marginVertical: 24 }} />
      ) : (
        <View style={styles.grid}>
          {stats.map((stat) => (
            <View
              key={stat.label}
              style={[
                styles.stat,
                { backgroundColor: c.surface, borderColor: c.border },
              ]}
            >
              <Text style={[styles.statLabel, { color: c.muted }]}>
                {stat.label}
              </Text>
              <Text style={[styles.statValue, { color: c.text }]}>
                {stat.value}
              </Text>
              <Text style={[styles.statHint, { color: c.primary }]}>
                {stat.hint}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View
        style={[
          styles.chartCard,
          { backgroundColor: c.surface, borderColor: c.border },
        ]}
      >
        <Text style={[styles.cardTitle, { color: c.text }]}>
          Weekly progress
        </Text>
        {dashboard.graphsQuery.isLoading && weekly.length === 0 ? (
          <ActivityIndicator color={c.primary} style={{ marginVertical: 24 }} />
        ) : (
          <View style={styles.bars}>
            {(weekly.length
              ? weekly
              : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                  (day) => ({ day, completed: 0, pending: 0 }),
                )
            ).map((row) => {
              const total = row.completed + row.pending;
              const h = Math.max(8, Math.round((total / maxBar) * 100));
              return (
                <View key={row.day} style={styles.barCol}>
                  <View
                    style={[
                      styles.bar,
                      { height: h, backgroundColor: c.primary },
                    ]}
                  />
                  <Text style={[styles.barLabel, { color: c.muted }]}>
                    {row.day[0]}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      <Text style={[styles.navHeading, { color: c.text }]}>Go to</Text>
      {navItems.map((item) => (
        <TouchableOpacity
          key={item.route}
          style={[styles.navBtn, { backgroundColor: c.primary }]}
          onPress={() => navigation.navigate(item.route, { orgCode })}
        >
          <Text style={styles.navBtnText}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { fontSize: 24, fontWeight: "700" },
  sub: { marginTop: 4, marginBottom: spacing.lg, fontSize: 13 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  stat: {
    width: "48%",
    flexGrow: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
  },
  statLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase" },
  statValue: { fontSize: 26, fontWeight: "700", marginTop: 6 },
  statHint: { fontSize: 11, marginTop: 4, fontWeight: "600" },
  chartCard: {
    marginTop: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", marginBottom: spacing.sm },
  bars: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 120,
  },
  barCol: { alignItems: "center", flex: 1 },
  bar: { width: 18, borderRadius: 8, marginBottom: 6 },
  barLabel: { fontSize: 10 },
  navHeading: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    fontSize: 15,
    fontWeight: "700",
  },
  navBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  navBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
