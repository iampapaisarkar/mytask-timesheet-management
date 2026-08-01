import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { spacing } from "@mytask/theme";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useThemeStore } from "../store/themeStore";

type Props = NativeStackScreenProps<RootStackParamList, "Legal">;

const HELP_ITEMS = [
  "How do I clock in? Open your organisation dashboard and use Clock in when you start work.",
  "Where are my timesheets? From the organisation home, open My Timesheets to view and submit periods.",
  "Who can approve timesheets? Managers and owners with Timesheet Management access can review submissions.",
  "How do I reset my password? Use Forgot password on the login screen to receive a reset email.",
  "Need more help? Contact your organisation admin or support via the myTask website.",
];

const TERMS_PARAS = [
  "Welcome to myTask. By creating an account or using the app, you agree to these Terms of Use.",
  "myTask provides timesheet, workforce, and payroll-related tooling for organisations and their members. You are responsible for the accuracy of information you submit, including hours worked and personal details.",
  "Accounts are personal. Do not share login credentials. Organisation admins may manage membership, roles, and data within their workspace according to their subscription plan.",
  "We may update these terms as the product evolves. Continued use of myTask after changes means you accept the updated terms.",
  "These terms are a product summary for the mobile app and do not replace any signed commercial agreement between your organisation and myTask.",
];

const PRIVACY_PARAS = [
  "myTask respects your privacy. We collect account details (such as name, email, and phone), organisation membership, timesheet activity, and device-related signals needed to run the service.",
  "Location data may be collected while you are clocked in, only to support activity tracking features your organisation enables.",
  "We use your information to authenticate you, operate timesheets and related features, send transactional notifications, and improve reliability and security.",
  "Organisation admins may see workforce data within their org. We do not sell your personal information.",
  "For privacy requests or questions about myTask data practices, contact your organisation admin or myTask support.",
];

export function LegalScreen({ route }: Props) {
  const { kind } = route.params;
  const c = useThemeStore((s) => s.colors);

  const title =
    kind === "help" ? "Help" : kind === "terms" ? "Terms of use" : "Privacy";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={styles.container}
    >
      <Text style={[styles.title, { color: c.text }]}>{title}</Text>
      <Text style={[styles.brand, { color: c.primary }]}>myTask</Text>

      {kind === "help" ? (
        HELP_ITEMS.map((item) => (
          <View
            key={item}
            style={[
              styles.card,
              { backgroundColor: c.surface, borderColor: c.border },
            ]}
          >
            <Text style={[styles.body, { color: c.text }]}>{item}</Text>
          </View>
        ))
      ) : (
        (kind === "terms" ? TERMS_PARAS : PRIVACY_PARAS).map((para) => (
          <Text key={para} style={[styles.body, { color: c.text }]}>
            {para}
          </Text>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  title: { fontSize: 22, fontWeight: "700" },
  brand: { fontSize: 14, fontWeight: "700", marginBottom: spacing.sm },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
  },
  body: { fontSize: 14, lineHeight: 22 },
});
