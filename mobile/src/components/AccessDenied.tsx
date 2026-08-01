import { StyleSheet, Text, View } from "react-native";
import { spacing } from "@mytask/theme";
import { useThemeStore } from "../store/themeStore";

/**
 * Full-screen ACL deny state — matches web OrgAclRoute “Access denied”.
 */
export function AccessDenied({
  title = "Access denied",
  message = "You do not have permission to view this page.",
}: {
  title?: string;
  message?: string;
}) {
  const c = useThemeStore((s) => s.colors);
  return (
    <View style={[styles.wrap, { backgroundColor: c.bg }]}>
      <Text style={[styles.title, { color: c.text }]}>{title}</Text>
      <Text style={[styles.message, { color: c.muted }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  title: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  message: {
    marginTop: spacing.sm,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
