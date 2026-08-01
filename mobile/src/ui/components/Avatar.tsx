import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useThemeStore } from "../../store/themeStore";

type Props = {
  name?: string | null;
  uri?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

function initials(name?: string | null) {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "?";
}

export function Avatar({ name, size = 44, style }: Props) {
  const c = useThemeStore((s) => s.colors);
  const fontSize = Math.max(12, Math.round(size * 0.36));

  return (
    <View
      accessibilityLabel={name ? `Avatar for ${name}` : "Avatar"}
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: c.primarySoft,
        },
        style,
      ]}
    >
      <Text
        style={{
          color: c.secondary,
          fontSize,
          fontWeight: "700",
          letterSpacing: 0.3,
        }}
      >
        {initials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
