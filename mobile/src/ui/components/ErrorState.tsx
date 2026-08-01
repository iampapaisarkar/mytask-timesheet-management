import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { spacing, typography } from "@mytask/theme";
import { useThemeStore } from "../../store/themeStore";
import { Button } from "./Button";

type Props = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  icon?: ReactNode;
};

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn’t load this content. Please try again.",
  onRetry,
  retryLabel = "Try again",
  icon,
}: Props) {
  const c = useThemeStore((s) => s.colors);

  return (
    <View style={styles.wrap} accessibilityRole="alert">
      {icon}
      <Text style={[styles.title, { color: c.text }]}>{title}</Text>
      <Text style={[styles.description, { color: c.muted }]}>
        {description}
      </Text>
      {onRetry ? (
        <View style={styles.action}>
          <Button
            title={retryLabel}
            onPress={onRetry}
            variant="soft"
            fullWidth={false}
          />
        </View>
      ) : null}
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
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: "700",
    textAlign: "center",
  },
  description: {
    marginTop: spacing.sm,
    fontSize: typography.sizes.sm,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 300,
  },
  action: { marginTop: spacing.lg },
});
