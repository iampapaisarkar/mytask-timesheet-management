import type { ReactNode } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { radii, spacing, typography } from "@mytask/theme";
import { useThemeStore } from "../../store/themeStore";
import { touchTarget } from "../tokens";

type Props = {
  label?: string;
  error?: string | null;
  hint?: string;
  leftAccessory?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
} & TextInputProps;

export function TextField({
  label,
  error,
  hint,
  leftAccessory,
  containerStyle,
  style,
  ...rest
}: Props) {
  const c = useThemeStore((s) => s.colors);
  const hasError = Boolean(error);

  return (
    <View style={[styles.wrap, containerStyle]}>
      {label ? (
        <Text style={[styles.label, { color: c.muted }]}>{label}</Text>
      ) : null}
      <View
        style={[
          styles.field,
          {
            backgroundColor: c.surface,
            borderColor: hasError ? c.negative : c.border,
          },
        ]}
      >
        {leftAccessory}
        <TextInput
          placeholderTextColor={c.subtle}
          style={[styles.input, { color: c.text }, style]}
          {...rest}
        />
      </View>
      {hasError ? (
        <Text style={[styles.meta, { color: c.negative }]}>{error}</Text>
      ) : hint ? (
        <Text style={[styles.meta, { color: c.muted }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  field: {
    minHeight: touchTarget.comfortable,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: typography.sizes.md,
    paddingVertical: 12,
  },
  meta: {
    marginTop: 6,
    fontSize: typography.sizes.xs,
    fontWeight: "500",
  },
});
