import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { spacing } from "@mytask/theme";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useThemeStore } from "../store/themeStore";

type Props = NativeStackScreenProps<RootStackParamList, "SettingsHub">;

const SETTINGS_LINKS = [
  {
    label: "Organisation details",
    hint: "Name, code, your role",
    route: "OrganisationDetails" as const,
  },
  {
    label: "Holiday calendars",
    hint: "Public holidays",
    route: "HolidayCalendars" as const,
  },
  {
    label: "Payroll calendars",
    hint: "Pay periods",
    route: "PayrollCalendars" as const,
  },
];

export function SettingsHubScreen({ navigation, route }: Props) {
  const { orgCode } = route.params;
  const c = useThemeStore((s) => s.colors);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={styles.container}
    >
      <Text style={[styles.title, { color: c.text }]}>Settings</Text>
      <Text style={[styles.sub, { color: c.muted }]}>
        Organisation configuration
      </Text>
      {SETTINGS_LINKS.map((item) => (
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
      ))}
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
