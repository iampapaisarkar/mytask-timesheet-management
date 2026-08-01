import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useThemeStore } from "../store/themeStore";
import { touchTarget } from "../ui";

type Props = {
  onPress: () => void;
  children: ReactNode;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
  hitSlop?: number;
};

/** 44pt touch target icon button for headers and chrome. */
export function HeaderIconButton({
  onPress,
  children,
  accessibilityLabel,
  style,
  hitSlop = 6,
}: Props) {
  const c = useThemeStore((s) => s.colors);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={hitSlop}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: pressed ? c.primary + "14" : "transparent",
          borderColor: c.border,
        },
        style,
      ]}
    >
      <View style={styles.inner}>{children}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minWidth: touchTarget.min,
    minHeight: touchTarget.min,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  inner: {
    alignItems: "center",
    justifyContent: "center",
  },
});
