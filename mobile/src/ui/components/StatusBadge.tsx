import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { radii, typography } from "@mytask/theme";
import { useThemeStore } from "../../store/themeStore";
import { statusLabel, statusVisual } from "../status";

type Props = {
  status?: string | { code?: string; name?: string } | null;
  label?: string;
  size?: "sm" | "md";
  outlined?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Semantic status pill — never render raw status strings alone.
 */
export function StatusBadge({
  status,
  label,
  size = "sm",
  outlined = false,
  style,
}: Props) {
  const c = useThemeStore((s) => s.colors);
  const visual = statusVisual(c, status);
  const text = label || statusLabel(status);

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`Status ${text}`}
      style={[
        styles.badge,
        {
          backgroundColor: outlined ? "transparent" : visual.bg,
          borderColor: outlined ? visual.solid : visual.border,
          paddingHorizontal: size === "md" ? 12 : 10,
          paddingVertical: size === "md" ? 6 : 4,
        },
        style,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: visual.solid }]} />
      <Text
        style={[
          styles.label,
          {
            color: visual.text,
            fontSize: size === "md" ? typography.sizes.sm : typography.sizes.xs,
          },
        ]}
        numberOfLines={1}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
