import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { spacing } from "@mytask/theme";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useThemeStore } from "../store/themeStore";

type Props = NativeStackScreenProps<RootStackParamList, "SettingsHub">;

type SettingsLink =
  | {
      label: string;
      hint: string;
      route: "OrganisationDetails" | "HolidayCalendars" | "PayrollCalendars";
    }
  | {
      label: string;
      hint: string;
      legal: "help" | "terms" | "privacy";
    }
  | {
      label: string;
      hint: string;
      soon: true;
    };

const SETTINGS_LINKS: SettingsLink[] = [
  {
    label: "Organisation details",
    hint: "Name, code, your role",
    route: "OrganisationDetails",
  },
  {
    label: "Holiday calendars",
    hint: "Public holidays",
    route: "HolidayCalendars",
  },
  {
    label: "Payroll calendars",
    hint: "Pay periods",
    route: "PayrollCalendars",
  },
  { label: "Earning Rates", hint: "Rate catalogue", soon: true },
  { label: "Earning Rate Rules", hint: "Rule mappings", soon: true },
  { label: "Help", hint: "FAQs and tips", legal: "help" },
  { label: "Terms of use", hint: "myTask terms", legal: "terms" },
  { label: "Privacy", hint: "How we handle data", legal: "privacy" },
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
      {SETTINGS_LINKS.map((item) => {
        const interactive = !("soon" in item && item.soon);
        const content = (
          <>
            <Text style={[styles.label, { color: c.text }]}>{item.label}</Text>
            <Text style={[styles.hint, { color: c.muted }]}>
              {"soon" in item && item.soon
                ? `${item.hint} · Coming soon`
                : item.hint}
            </Text>
          </>
        );

        if (!interactive) {
          return (
            <View
              key={item.label}
              style={[
                styles.card,
                { backgroundColor: c.surface, borderColor: c.border },
              ]}
            >
              {content}
            </View>
          );
        }

        return (
          <TouchableOpacity
            key={item.label}
            style={[
              styles.card,
              { backgroundColor: c.surface, borderColor: c.border },
            ]}
            onPress={() => {
              if ("route" in item) {
                navigation.navigate(item.route, { orgCode });
              } else if ("legal" in item) {
                navigation.navigate("Legal", { kind: item.legal });
              }
            }}
          >
            {content}
            <Text style={[styles.chevron, { color: c.primary }]}>Open</Text>
          </TouchableOpacity>
        );
      })}
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
