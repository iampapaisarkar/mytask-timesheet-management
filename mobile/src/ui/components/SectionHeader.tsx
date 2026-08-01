import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { spacing, typography } from "@mytask/theme";
import { useThemeStore } from "../../store/themeStore";

type Props = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  right?: ReactNode;
};

export function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
  right,
}: Props) {
  const c = useThemeStore((s) => s.colors);

  return (
    <View style={styles.row}>
      <View style={styles.textCol}>
        <Text style={[styles.title, { color: c.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: c.muted }]}>{subtitle}</Text>
        ) : null}
      </View>
      {right}
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          hitSlop={8}
        >
          <Text style={[styles.action, { color: c.primary }]}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  textCol: { flex: 1, minWidth: 0 },
  title: {
    fontSize: typography.sizes.md,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 2,
    fontSize: typography.sizes.xs,
    fontWeight: "500",
  },
  action: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
  },
});
