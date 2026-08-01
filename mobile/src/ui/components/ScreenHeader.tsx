import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { spacing, typography } from "@mytask/theme";
import { useThemeStore } from "../../store/themeStore";

type Props = {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  large?: boolean;
};

export function ScreenHeader({
  title,
  subtitle,
  right,
  large = true,
}: Props) {
  const c = useThemeStore((s) => s.colors);

  return (
    <View style={styles.wrap}>
      <View style={styles.textCol}>
        <Text
          style={[
            styles.title,
            {
              color: c.text,
              fontSize: large ? typography.sizes.xxl : typography.sizes.xl,
            },
          ]}
          accessibilityRole="header"
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: c.muted }]}>{subtitle}</Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  textCol: { flex: 1, minWidth: 0 },
  title: {
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: 4,
    fontSize: typography.sizes.sm,
    lineHeight: 18,
  },
});
