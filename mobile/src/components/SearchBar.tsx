import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { spacing } from "@mytask/theme";
import { useThemeStore } from "../store/themeStore";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
} & Omit<TextInputProps, "value" | "onChangeText" | "placeholder">;

/**
 * Shared list search field — keep UI consistent across resource lists.
 */
export function SearchBar({
  value,
  onChangeText,
  placeholder = "Search…",
  ...rest
}: Props) {
  const c = useThemeStore((s) => s.colors);

  return (
    <View style={styles.wrap}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.muted}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        style={[
          styles.input,
          {
            backgroundColor: c.surface,
            borderColor: c.border,
            color: c.text,
          },
        ]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.sm },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
  },
});
