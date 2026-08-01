import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { can, getOrganisationAcl } from "@mytask/services";
import { spacing } from "@mytask/theme";
import { ChevronIcon } from "../ui";
import type { MoreStackParamList, RootStackParamList } from "../navigation/types";
import { useOrganisationStore } from "../store/organisationStore";
import { useThemeStore } from "../store/themeStore";

type Props = NativeStackScreenProps<MoreStackParamList, "MoreHome">;

type MoreRoute = Exclude<keyof MoreStackParamList, "MoreHome">;

export function MoreScreen({ navigation, route }: Props) {
  const { orgCode } = route.params;
  const rootNav =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const organisation = useOrganisationStore((s) => s.organisation);
  const clear = useOrganisationStore((s) => s.clear);
  const c = useThemeStore((s) => s.colors);
  const acl = getOrganisationAcl(organisation?.role || organisation?.role_code);

  const items: Array<{ label: string; hint: string; route: MoreRoute }> = [
    ...(can(acl, "employee", "list")
      ? [
          {
            label: "Employees",
            hint: "Team members and invitations",
            route: "EmployeesList" as const,
          },
        ]
      : []),
    ...(can(acl, "customer", "list")
      ? [
          {
            label: "Customers",
            hint: "Client directory",
            route: "CustomersList" as const,
          },
        ]
      : []),
    ...(can(acl, "job", "list")
      ? [{ label: "Jobs", hint: "Work sites and jobs", route: "JobsList" as const }]
      : []),
    ...(can(acl, "report", "view")
      ? [
          {
            label: "Reports",
            hint: "Pay reports and PDF",
            route: "Reports" as const,
          },
        ]
      : []),
    ...(can(acl, "payout", "list")
      ? [
          {
            label: "Payouts",
            hint: "Payroll payouts",
            route: "Payouts" as const,
          },
        ]
      : []),
    ...(can(acl, "systemLog", "list")
      ? [
          {
            label: "System logs",
            hint: "Audit trail",
            route: "SystemLogs" as const,
          },
        ]
      : []),
    ...(can(acl, "setting", "list")
      ? [
          {
            label: "Settings",
            hint: "Organisation configuration",
            route: "SettingsHub" as const,
          },
        ]
      : []),
  ];

  async function leaveOrganisation() {
    await clear();
    rootNav.reset({
      index: 0,
      routes: [{ name: "Home" }],
    });
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={styles.container}
    >
      <Text style={[styles.title, { color: c.text }]}>More</Text>
      <Text style={[styles.sub, { color: c.muted }]}>
        Organisation tools and settings
      </Text>

      {items.map((item) => (
        <TouchableOpacity
          key={item.route}
          style={[
            styles.card,
            { backgroundColor: c.surface, borderColor: c.border },
          ]}
          onPress={() => {
            // Narrow per-route for the More stack navigator.
            switch (item.route) {
              case "EmployeesList":
                navigation.navigate("EmployeesList", { orgCode });
                break;
              case "CustomersList":
                navigation.navigate("CustomersList", { orgCode });
                break;
              case "JobsList":
                navigation.navigate("JobsList", { orgCode });
                break;
              case "Reports":
                navigation.navigate("Reports", { orgCode });
                break;
              case "Payouts":
                navigation.navigate("Payouts", { orgCode });
                break;
              case "SystemLogs":
                navigation.navigate("SystemLogs", { orgCode });
                break;
              case "SettingsHub":
                navigation.navigate("SettingsHub", { orgCode });
                break;
              default:
                break;
            }
          }}
          activeOpacity={0.85}
        >
          <View style={styles.cardText}>
            <Text style={[styles.label, { color: c.text }]}>{item.label}</Text>
            <Text style={[styles.hint, { color: c.muted }]}>{item.hint}</Text>
          </View>
          <ChevronIcon color={c.muted} />
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={[styles.leave, { borderColor: c.border }]}
        onPress={() => void leaveOrganisation()}
      >
        <Text style={[styles.leaveText, { color: c.primary }]}>
          Back to myTask
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { fontSize: 22, fontWeight: "700" },
  sub: { marginTop: 4, marginBottom: spacing.lg, fontSize: 13 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  cardText: { flex: 1, minWidth: 0 },
  label: { fontSize: 15, fontWeight: "700" },
  hint: { marginTop: 4, fontSize: 12 },
  leave: {
    marginTop: spacing.lg,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: "center",
  },
  leaveText: { fontWeight: "700", fontSize: 15 },
});
