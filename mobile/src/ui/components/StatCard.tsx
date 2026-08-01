import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { radii, spacing, typography } from "@mytask/theme";
import { useThemeStore } from "../../store/themeStore";
import { elevation } from "../tokens";

type Props = {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  accent?: string;
};

export function StatCard({ label, value, hint, icon, accent }: Props) {
  const c = useThemeStore((s) => s.colors);
  const tint = accent || c.primary;

  return (
    <View
      style={[
        styles.card,
        elevation.card,
        {
          backgroundColor: c.surface,
          borderColor: c.border,
        },
      ]}
      accessibilityLabel={`${label}: ${value}${hint ? `. ${hint}` : ""}`}
    >
      <View style={styles.top}>
        <Text style={[styles.label, { color: c.muted }]} numberOfLines={1}>
          {label}
        </Text>
        {icon ? (
          <View style={[styles.icon, { backgroundColor: `${tint}18` }]}>
            {icon}
          </View>
        ) : null}
      </View>
      <Text style={[styles.value, { color: c.text }]} numberOfLines={1}>
        {value}
      </Text>
      {hint ? (
        <Text style={[styles.hint, { color: tint }]} numberOfLines={2}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "48%",
    flexGrow: 1,
    minWidth: "46%",
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  label: {
    flex: 1,
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  icon: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    marginTop: 10,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  hint: {
    marginTop: 4,
    fontSize: typography.sizes.xs,
    fontWeight: "600",
  },
});
