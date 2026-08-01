import { ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { spacing } from "@mytask/theme";
import { AccessDenied } from "../components/AccessDenied";
import { useOrgAcl } from "../hooks/useOrgAcl";
import type { MoreStackParamList } from "../navigation/types";
import { useThemeStore } from "../store/themeStore";

type Props = NativeStackScreenProps<MoreStackParamList, "SettingsHub">;

type SettingsRoute =
  | "OrganisationDetails"
  | "HolidayCalendars"
  | "PayrollCalendars";

export function SettingsHubScreen({ navigation, route }: Props) {
  const { orgCode } = route.params;
  const c = useThemeStore((s) => s.colors);
  const { can } = useOrgAcl();

  if (!can("setting", "list")) {
    return <AccessDenied />;
  }

  const links: Array<{
    label: string;
    hint: string;
    route: SettingsRoute;
  }> = [
    ...(can("organisationSetting", "view")
      ? [
          {
            label: "Organisation details",
            hint: "Name, code, your role",
            route: "OrganisationDetails" as const,
          },
        ]
      : []),
    ...(can("holidayCalendar", "list")
      ? [
          {
            label: "Holiday calendars",
            hint: "Public holidays",
            route: "HolidayCalendars" as const,
          },
        ]
      : []),
    ...(can("payrollCalendar", "list")
      ? [
          {
            label: "Payroll calendars",
            hint: "Pay periods",
            route: "PayrollCalendars" as const,
          },
        ]
      : []),
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={styles.container}
    >
      <Text style={[styles.title, { color: c.text }]}>Settings</Text>
      <Text style={[styles.sub, { color: c.muted }]}>
        Organisation configuration
      </Text>
      {links.length === 0 ? (
        <Text style={{ color: c.muted }}>
          No settings are available for your role.
        </Text>
      ) : (
        links.map((item) => (
          <TouchableOpacity
            key={item.route}
            style={[
              styles.card,
              { backgroundColor: c.surface, borderColor: c.border },
            ]}
            onPress={() => navigation.navigate(item.route, { orgCode })}
          >
            <Text style={[styles.label, { color: c.text }]}>{item.label}</Text>
            <Text style={[styles.hint, { color: c.muted }]}>{item.hint}</Text>
            <Text style={[styles.chevron, { color: c.primary }]}>Open</Text>
          </TouchableOpacity>
        ))
      )}
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
  },
  label: { fontSize: 15, fontWeight: "700" },
  hint: { marginTop: 4, fontSize: 12 },
  chevron: { marginTop: 8, fontWeight: "700", fontSize: 12 },
});
