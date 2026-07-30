import { ScrollView, StyleSheet, Text, View } from "react-native";
import { spacing } from "@mytask/theme";
import { useThemeStore } from "../store/themeStore";

const SETTINGS_LINKS = [
  { label: "Organisation details", hint: "Name, timezone, branding" },
  { label: "Region", hint: "Service regions" },
  { label: "Holiday Calendar", hint: "Public holidays" },
  { label: "Payroll Calendar", hint: "Pay periods" },
  { label: "Earning Rates", hint: "Rate catalogue" },
  { label: "Earning Rate Rules", hint: "Rule mappings" },
];

export function SettingsHubScreen() {
  const c = useThemeStore((s) => s.colors);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={styles.container}
    >
      <Text style={[styles.title, { color: c.text }]}>Settings</Text>
      <Text style={[styles.sub, { color: c.muted }]}>
        Organisation configuration — screens coming soon
      </Text>
      {SETTINGS_LINKS.map((item) => (
        <View
          key={item.label}
          style={[
            styles.card,
            { backgroundColor: c.surface, borderColor: c.border },
          ]}
        >
          <Text style={[styles.label, { color: c.text }]}>{item.label}</Text>
          <Text style={[styles.hint, { color: c.muted }]}>{item.hint}</Text>
        </View>
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
});
