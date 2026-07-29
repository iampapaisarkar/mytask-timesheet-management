import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { spacing } from "@mytask/theme";
import { isTracking } from "../services/trackingSession";
import { useAuthStore } from "../store/authStore";
import { useOrganisationStore } from "../store/organisationStore";
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";

export function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);
  const clearOrg = useOrganisationStore((s) => s.clear);
  const c = useThemeStore((s) => s.colors);
  const mode = useThemeStore((s) => s.mode);
  const toggle = useThemeStore((s) => s.toggle);
  const toast = useToastStore();

  async function logout() {
    if (await isTracking()) {
      Alert.alert(
        "Tracking in progress",
        "Stop clock-in tracking before signing out.",
      );
      toast.warning("Stop tracking before logout");
      return;
    }
    await clearSession();
    await clearOrg();
    toast.info("Signed out");
  }

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={[styles.label, { color: c.muted }]}>Signed in as</Text>
        <Text style={[styles.name, { color: c.text }]}>
          {user?.email || "Account"}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.row, { backgroundColor: c.surface, borderColor: c.border }]}
        onPress={() => void toggle()}
      >
        <Text style={[styles.rowText, { color: c.text }]}>Theme</Text>
        <Text style={{ color: c.primary, fontWeight: "700" }}>
          {mode === "dark" ? "Dark" : "Light"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.logout, { backgroundColor: c.primary }]}
        onPress={() => void logout()}
      >
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, gap: spacing.md },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.lg,
  },
  label: { fontSize: 12, fontWeight: "600", marginBottom: 4 },
  name: { fontSize: 18, fontWeight: "700" },
  row: {
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowText: { fontWeight: "600" },
  logout: {
    marginTop: "auto",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  logoutText: { color: "#fff", fontWeight: "700" },
});
