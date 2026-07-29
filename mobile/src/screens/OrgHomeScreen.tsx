import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { spacing } from "@mytask/theme";
import { useOrganisationStore } from "../store/organisationStore";
import { useThemeStore } from "../store/themeStore";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "OrgHome">;

const STATS = [
  { label: "Completed", value: "128", hint: "+12% week" },
  { label: "Pending", value: "34", hint: "6 due today" },
  { label: "Rate", value: "72%", hint: "On track" },
  { label: "Team", value: "46", hint: "Active" },
];

export function OrgHomeScreen({ navigation, route }: Props) {
  const organisation = useOrganisationStore((s) => s.organisation);
  const { orgCode } = route.params;
  const c = useThemeStore((s) => s.colors);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={styles.container}
    >
      <Text style={[styles.title, { color: c.text }]}>
        {organisation?.name || orgCode}
      </Text>
      <Text style={[styles.sub, { color: c.muted }]}>
        Organisation dashboard
      </Text>

      <View style={styles.grid}>
        {STATS.map((stat) => (
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

      <View
        style={[
          styles.chartCard,
          { backgroundColor: c.surface, borderColor: c.border },
        ]}
      >
        <Text style={[styles.cardTitle, { color: c.text }]}>Weekly progress</Text>
        <View style={styles.bars}>
          {[62, 78, 54, 88, 70, 40, 28].map((h, i) => (
            <View key={i} style={styles.barCol}>
              <View
                style={[
                  styles.bar,
                  { height: h, backgroundColor: c.primary },
                ]}
              />
              <Text style={[styles.barLabel, { color: c.muted }]}>
                {"MTWTFSS"[i]}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.cta, { backgroundColor: c.primary }]}
        onPress={() => navigation.navigate("Timesheets", { orgCode })}
      >
        <Text style={styles.ctaText}>My Timesheets</Text>
      </TouchableOpacity>
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
  cardTitle: { fontSize: 15, fontWeight: "700", marginBottom: spacing.md },
  bars: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 120,
  },
  barCol: { alignItems: "center", flex: 1 },
  bar: { width: 18, borderRadius: 8, marginBottom: 6 },
  barLabel: { fontSize: 10 },
  cta: {
    marginTop: spacing.lg,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },
  ctaText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
