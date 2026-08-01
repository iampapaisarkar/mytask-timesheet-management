import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { radii, spacing, typography } from "@mytask/theme";
import { useThemeStore } from "../../store/themeStore";
import { Button } from "./Button";

type Props = {
  title: string;
  description?: string;
  icon?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
};

/**
 * Premium empty list / section state with optional CTA.
 */
export function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onAction,
}: Props) {
  const c = useThemeStore((s) => s.colors);

  return (
    <View
      style={styles.wrap}
      accessibilityRole="summary"
      accessibilityLabel={`${title}. ${description || ""}`}
    >
      {icon ? (
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: c.primarySoft },
          ]}
        >
          {icon}
        </View>
      ) : (
        <View
          style={[
            styles.iconFallback,
            { backgroundColor: c.primarySoft },
          ]}
        />
      )}
      <Text style={[styles.title, { color: c.text }]}>{title}</Text>
      {description ? (
        <Text style={[styles.description, { color: c.muted }]}>
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <Button
            title={actionLabel}
            onPress={onAction}
            size="md"
            fullWidth={false}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: radii.xl,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  iconFallback: {
    width: 56,
    height: 56,
    borderRadius: radii.xl,
    marginBottom: spacing.md,
    opacity: 0.7,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: "700",
    textAlign: "center",
  },
  description: {
    marginTop: spacing.sm,
    fontSize: typography.sizes.sm,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 280,
  },
  action: {
    marginTop: spacing.lg,
  },
});
