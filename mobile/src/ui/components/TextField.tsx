import { forwardRef, type ReactNode } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { radii, spacing, typography } from "@mytask/theme";
import { useThemeStore } from "../../store/themeStore";
import { touchTarget } from "../tokens";

type Props = {
  label?: string;
  error?: string | null;
  hint?: string;
  leftAccessory?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  /**
   * Use `"bottomSheet"` inside AppBottomSheet / BottomSheetModal so the sheet
   * can lift with the keypad (same as Grubly GInput inputType="bottomSheet").
   */
  inputType?: "default" | "bottomSheet";
} & Omit<TextInputProps, "style"> & {
    style?: StyleProp<TextStyle>;
  };

export const TextField = forwardRef<TextInput, Props>(function TextField(
  {
    label,
    error,
    hint,
    leftAccessory,
    containerStyle,
    inputStyle,
    inputType = "default",
    style,
    accessibilityLabel,
    accessibilityState,
    accessibilityHint,
    ...rest
  },
  ref,
) {
  const c = useThemeStore((s) => s.colors);
  const hasError = Boolean(error);
  const InputComponent =
    inputType === "bottomSheet" ? BottomSheetTextInput : TextInput;

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
        <InputComponent
          ref={ref as never}
          placeholderTextColor={c.subtle}
          style={[styles.input, { color: c.text }, inputStyle, style]}
          accessibilityLabel={accessibilityLabel || label}
          accessibilityHint={
            accessibilityHint ||
            (hasError && error ? `Error: ${error}` : undefined)
          }
          accessibilityState={{
            ...(typeof accessibilityState === "object"
              ? accessibilityState
              : null),
            disabled: rest.editable === false,
          } as TextInputProps["accessibilityState"]}
          {...rest}
        />
      </View>
      {hasError ? (
        <Text
          style={[styles.meta, { color: c.negative }]}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          {error}
        </Text>
      ) : hint ? (
        <Text style={[styles.meta, { color: c.muted }]}>{hint}</Text>
      ) : null}
    </View>
  );
});

TextField.displayName = "TextField";

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
