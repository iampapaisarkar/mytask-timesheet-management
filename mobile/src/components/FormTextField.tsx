import {
  StyleSheet,
  Text,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { TextField } from "../ui";
import { useThemeStore } from "../store/themeStore";

type Props<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label?: string;
  hint?: string;
  inputType?: "default" | "bottomSheet";
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
} & Omit<
  TextInputProps,
  "value" | "onChangeText" | "defaultValue" | "style"
>;

/**
 * React Hook Form + TextField binder (Signup pattern).
 * Pass inputType="bottomSheet" inside AppBottomSheet.
 */
export function FormTextField<T extends FieldValues>({
  control,
  name,
  label,
  hint,
  inputType = "default",
  containerStyle,
  inputStyle,
  ...rest
}: Props<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value, ref }, fieldState }) => (
        <TextField
          ref={ref}
          label={label}
          hint={hint}
          inputType={inputType}
          containerStyle={containerStyle}
          inputStyle={inputStyle}
          value={value == null ? "" : String(value)}
          onChangeText={onChange}
          onBlur={onBlur}
          error={fieldState.error?.message}
          accessibilityHint={
            fieldState.error?.message
              ? `Error: ${fieldState.error.message}`
              : undefined
          }
          {...rest}
        />
      )}
    />
  );
}

/** Standalone error text for selects / custom fields. */
export function FormFieldError({
  message,
  style,
}: {
  message?: string | null;
  style?: StyleProp<TextStyle>;
}) {
  const c = useThemeStore((s) => s.colors);
  if (!message) return null;
  return (
    <Text
      style={[styles.error, { color: c.negative }, style]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      {message}
    </Text>
  );
}

const styles = StyleSheet.create({
  error: {
    marginTop: -4,
    marginBottom: 12,
    fontSize: 12,
    fontWeight: "500",
  },
});
