import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { radii, spacing, typography } from "@mytask/theme";
import { useThemeStore } from "../store/themeStore";
import { elevation, touchTarget } from "../ui/tokens";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
} & Omit<TextInputProps, "value" | "onChangeText" | "placeholder">;

function SearchGlyph({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx={11} cy={11} r={6.5} stroke={color} strokeWidth={1.9} />
      <Path
        d="M16.5 16.5 20 20"
        stroke={color}
        strokeWidth={1.9}
        strokeLinecap="round"
      />
    </Svg>
  );
}

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
      <View
        style={[
          styles.field,
          elevation.soft,
          {
            backgroundColor: c.surface,
            borderColor: c.border,
          },
        ]}
      >
        <SearchGlyph color={c.subtle} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={c.subtle}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          accessibilityLabel={placeholder}
          style={[styles.input, { color: c.text }]}
          {...rest}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.sm },
  field: {
    minHeight: touchTarget.min,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: typography.sizes.md,
  },
});
