import type { ReactNode } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { spacing } from "@mytask/theme";
import { useThemeStore } from "../store/themeStore";

type Edges = {
  top?: boolean;
  bottom?: boolean;
  left?: boolean;
  right?: boolean;
};

/**
 * Safe-area aware screen shell. Prefer this when a screen has no native stack
 * header, or when content must clear the home indicator.
 */
export function Screen({
  children,
  scroll = false,
  edges = { top: false, bottom: true, left: true, right: true },
  style,
  contentStyle,
  padded = true,
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edges;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  padded?: boolean;
}) {
  const c = useThemeStore((s) => s.colors);
  const insets = useSafeAreaInsets();

  const padStyle: ViewStyle = {
    paddingTop: edges.top ? insets.top : 0,
    paddingBottom: edges.bottom ? Math.max(insets.bottom, spacing.sm) : 0,
    paddingLeft: edges.left ? Math.max(insets.left, padded ? spacing.lg : 0) : 0,
    paddingRight: edges.right
      ? Math.max(insets.right, padded ? spacing.lg : 0)
      : 0,
  };

  if (scroll) {
    return (
      <ScrollView
        style={[{ flex: 1, backgroundColor: c.bg }, style]}
        contentContainerStyle={[
          padStyle,
          padded && styles.scrollPad,
          contentStyle,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <View
      style={[
        { flex: 1, backgroundColor: c.bg },
        padStyle,
        style,
      ]}
    >
      <View style={[{ flex: 1 }, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollPad: { paddingBottom: spacing.xxl },
});
