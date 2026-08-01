import { StyleSheet, Text, View } from "react-native";
import { radii, spacing, typography } from "@mytask/theme";
import { useThemeStore } from "../store/themeStore";
import { AlertIcon } from "../ui/icons";

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
    <View
      style={[styles.wrap, { backgroundColor: c.bg }]}
      accessibilityRole="alert"
    >
      <View style={[styles.iconWrap, { backgroundColor: c.negativeSoft }]}>
        <AlertIcon color={c.negative} size={28} />
      </View>
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
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: radii.xl,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: "700",
    textAlign: "center",
  },
  message: {
    marginTop: spacing.sm,
    fontSize: typography.sizes.sm,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 300,
  },
});
